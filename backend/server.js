const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const socketIo = require("socket.io");
require("./config/db");

// Routes
const authRoutes = require("./routes/authRoutes");
const teamRoutes = require("./routes/teamRoutes");
const debateRoutes = require("./routes/debateRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const voteRoutes = require("./routes/voteRoutes");
const resultRoutes = require("./routes/resultRoutes");
const liveDebateMessageRoutes = require("./routes/liveDebateMessageRoutes");
const aiDebateRoutes = require("./routes/aiDebateRoutes");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const BODY_LIMIT = process.env.BODY_LIMIT || "25mb";

app.use(cors());
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.set("io", io);

app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/debates", debateRoutes);
app.use("/api/submission", submissionRoutes);
app.use("/api/votes", voteRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/live-debate-messages", liveDebateMessageRoutes);
app.use("/api/ai-debates", aiDebateRoutes);

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);

  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      message: `Request payload is too large. Current limit: ${BODY_LIMIT}.`
    });
  }

  res.status(500).json({ message: "Internal Server Error", error: err.message });
});

const rooms = new Map();

function getRoomState(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      participants: [],
      currentSpeaker: null,
      turnTimer: null,
      speakingQueue: []
    });
  }

  return rooms.get(roomId);
}

function emitParticipants(roomId) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  io.to(roomId).emit("participants-updated", { participants: room.participants });
}

function clearSpeakerIfNeeded(room, participant) {
  if (room.currentSpeaker !== participant.userId) {
    return;
  }

  if (room.turnTimer) {
    clearInterval(room.turnTimer);
  }

  room.currentSpeaker = null;
  room.turnTimer = null;
}

function startSpeakerTurn(roomId, userId) {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }

  room.currentSpeaker = userId;

  if (room.turnTimer) {
    clearInterval(room.turnTimer);
  }

  const turnDuration = 120;
  let timeLeft = turnDuration;

  io.to(roomId).emit("speaking-turn", { userId, timeLeft });

  room.turnTimer = setInterval(() => {
    timeLeft -= 1;
    io.to(roomId).emit("speaking-turn", { userId, timeLeft });

    if (timeLeft > 0) {
      return;
    }

    clearInterval(room.turnTimer);
    room.turnTimer = null;
    room.currentSpeaker = null;
    io.to(roomId).emit("turn-ended");

    const nextSpeaker = room.speakingQueue.shift();
    if (nextSpeaker) {
      startSpeakerTurn(roomId, nextSpeaker);
    }
  }, 1000);
}

function removeParticipant(socket) {
  const { roomId } = socket.data || {};
  if (!roomId || !rooms.has(roomId)) {
    return;
  }

  const room = rooms.get(roomId);
  const participantIndex = room.participants.findIndex((entry) => entry.socketId === socket.id);

  if (participantIndex === -1) {
    return;
  }

  const [participant] = room.participants.splice(participantIndex, 1);
  room.speakingQueue = room.speakingQueue.filter((userId) => userId !== participant.userId);
  clearSpeakerIfNeeded(room, participant);

  socket.leave(roomId);
  socket.to(roomId).emit("participant-left", {
    socketId: participant.socketId,
    userId: participant.userId
  });
  emitParticipants(roomId);

  if (room.participants.length === 0) {
    if (room.turnTimer) {
      clearInterval(room.turnTimer);
    }
    rooms.delete(roomId);
  }

  socket.data.roomId = null;
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (data = {}) => {
    const { roomId, userId, userName, teamName, role } = data;

    if (!roomId || !userId || !userName) {
      socket.emit("room-error", { message: "Room join payload is incomplete." });
      return;
    }

    removeParticipant(socket);

    const room = getRoomState(roomId);
    const participant = {
      socketId: socket.id,
      userId,
      userName,
      teamName: teamName || "",
      role: role || "",
      muted: false
    };

    room.participants.push(participant);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userId = userId;

    socket.emit("room-joined", {
      roomId,
      participants: room.participants
    });
    emitParticipants(roomId);
  });

  socket.on("leave-room", () => {
    removeParticipant(socket);
    socket.emit("room-left");
  });

  socket.on("toggle-media", (data = {}) => {
    const { roomId } = socket.data || {};
    if (!roomId || !rooms.has(roomId)) {
      return;
    }

    const room = rooms.get(roomId);
    const participant = room.participants.find((entry) => entry.socketId === socket.id);

    if (!participant) {
      return;
    }

    if (typeof data.muted === "boolean") {
      participant.muted = data.muted;
    }

    emitParticipants(roomId);
  });

  socket.on("request-turn", () => {
    const { roomId, userId } = socket.data || {};
    if (!roomId || !userId || !rooms.has(roomId)) {
      return;
    }

    const room = rooms.get(roomId);
    const participant = room.participants.find((entry) => entry.userId === userId);

    if (!participant) {
      return;
    }

    if (room.currentSpeaker && room.currentSpeaker !== userId) {
      if (!room.speakingQueue.includes(userId)) {
        room.speakingQueue.push(userId);
      }
      return;
    }

    startSpeakerTurn(roomId, userId);
  });

  socket.on("webrtc-offer", ({ targetSocketId, offer, caller }) => {
    if (!targetSocketId || !offer) {
      return;
    }

    io.to(targetSocketId).emit("webrtc-offer", {
      offer,
      caller,
      targetSocketId: socket.id
    });
  });

  socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
    if (!targetSocketId || !answer) {
      return;
    }

    io.to(targetSocketId).emit("webrtc-answer", {
      answer,
      sourceSocketId: socket.id
    });
  });

  socket.on("webrtc-ice-candidate", ({ targetSocketId, candidate }) => {
    if (!targetSocketId || !candidate) {
      return;
    }

    io.to(targetSocketId).emit("webrtc-ice-candidate", {
      candidate,
      sourceSocketId: socket.id
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    removeParticipant(socket);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
