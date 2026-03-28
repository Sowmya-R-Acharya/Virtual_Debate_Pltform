import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Timer from "../../components/Timer";
import "../../styles/dashboard.css";
import api from "../../services/api";
import io from "socket.io-client";
import { useNavigate } from "react-router-dom";

const SOCKET_URL = "http://localhost:5000";
const RTC_CONFIGURATION = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

export default function DebaterDashboard() {
  const navigate = useNavigate();
  const [assignedDebates, setAssignedDebates] = useState([]);
  const [activeDebateId, setActiveDebateId] = useState(null);
  const [currentDebateId, setCurrentDebateId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  const [inRoom, setInRoom] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [speakingTurn, setSpeakingTurn] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [remotePeers, setRemotePeers] = useState([]);
  const [callError, setCallError] = useState("");
  const [voiceMessages, setVoiceMessages] = useState([]);
  const [isRecordingVoiceMessage, setIsRecordingVoiceMessage] = useState(false);
  const [isSavingVoiceMessage, setIsSavingVoiceMessage] = useState(false);
  const [voiceMessageError, setVoiceMessageError] = useState("");

  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef({});
  const joinedRoomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordingStartedAtRef = useRef(null);
  const shouldPersistRecordingRef = useRef(false);

  const currentUserRef = useRef(JSON.parse(localStorage.getItem("user") || "null"));
  const currentUser = currentUserRef.current;

  const cleanupPeerConnections = useCallback(() => {
    Object.values(peerConnectionsRef.current).forEach((connection) => connection.close());
    peerConnectionsRef.current = {};
    remoteStreamsRef.current = {};
    setRemotePeers([]);
  }, []);

  const cleanupRecorder = useCallback((persist = false) => {
    shouldPersistRecordingRef.current = persist;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      return;
    }

    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
    recordingStartedAtRef.current = null;
    setIsRecordingVoiceMessage(false);
    if (!persist) {
      setIsSavingVoiceMessage(false);
    }
  }, []);

  const cleanupRoomSession = useCallback(() => {
    cleanupRecorder(false);
    cleanupPeerConnections();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
  }, [cleanupPeerConnections, cleanupRecorder]);

  const removePeer = useCallback((socketId) => {
    const connection = peerConnectionsRef.current[socketId];
    if (connection) {
      connection.close();
      delete peerConnectionsRef.current[socketId];
    }

    delete remoteStreamsRef.current[socketId];
    setRemotePeers((prev) => prev.filter((peer) => peer.socketId !== socketId));
  }, []);

  const upsertRemotePeer = useCallback((participant, stream) => {
    remoteStreamsRef.current[participant.socketId] = stream;

    setRemotePeers((prev) => {
      const nextPeers = prev.filter((peer) => peer.socketId !== participant.socketId);
      nextPeers.push({
        socketId: participant.socketId,
        userId: participant.userId,
        userName: participant.userName,
        teamName: participant.teamName,
        stream
      });
      return nextPeers;
    });
  }, []);

  const createPeerConnection = useCallback((participant) => {
    if (peerConnectionsRef.current[participant.socketId]) {
      return peerConnectionsRef.current[participant.socketId];
    }

    const connection = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionsRef.current[participant.socketId] = connection;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        connection.addTrack(track, localStreamRef.current);
      });
    }

    connection.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current) {
        return;
      }

      socketRef.current.emit("webrtc-ice-candidate", {
        targetSocketId: participant.socketId,
        candidate: event.candidate
      });
    };

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        upsertRemotePeer(participant, stream);
      }
    };

    connection.onconnectionstatechange = () => {
      if (["closed", "disconnected", "failed"].includes(connection.connectionState)) {
        removePeer(participant.socketId);
      }
    };

    return connection;
  }, [removePeer, upsertRemotePeer]);

  const createOfferForParticipant = useCallback(async (participant) => {
    if (!socketRef.current || !participant?.socketId) {
      return;
    }

    const connection = createPeerConnection(participant);
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    socketRef.current.emit("webrtc-offer", {
      targetSocketId: participant.socketId,
      offer,
      caller: {
        socketId: socketRef.current.id,
        userId: currentUserRef.current.id,
        userName: currentUserRef.current.name,
        teamName: currentUserRef.current.team_name
      }
    });
  }, [createPeerConnection]);

  const loadVoiceMessages = useCallback(async (debateId) => {
    if (!debateId) {
      setVoiceMessages([]);
      return;
    }

    try {
      const response = await api.get(`/live-debate-messages/${debateId}`);
      setVoiceMessages(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load live debate messages:", error);
      setVoiceMessageError("Unable to load saved voice messages for this debate.");
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    api.get(`/debates/assigned/${currentUser.team_name}`)
      .then((res) => setAssignedDebates(res.data))
      .catch((err) => console.error(err));

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("room-joined", async ({ roomId, participants: roomParticipants }) => {
      setInRoom(true);
      setCurrentRoom(roomId);
      joinedRoomRef.current = roomId;
      setParticipants(roomParticipants);
      setVoiceMessageError("");

      const existingParticipants = roomParticipants.filter(
        (participant) => participant.socketId !== socket.id
      );

      for (const participant of existingParticipants) {
        await createOfferForParticipant(participant);
      }
    });

    socket.on("room-left", () => {
      cleanupPeerConnections();
      setInRoom(false);
      setCurrentRoom(null);
      joinedRoomRef.current = null;
      setParticipants([]);
      setRemotePeers([]);
      setVoiceMessages([]);
      setCurrentDebateId(null);
    });

    socket.on("room-error", ({ message }) => {
      setCallError(message || "Unable to join the live debate room.");
    });

    socket.on("participants-updated", ({ participants: roomParticipants }) => {
      setParticipants(roomParticipants);
    });

    socket.on("participant-left", ({ socketId }) => {
      removePeer(socketId);
    });

    socket.on("speaking-turn", ({ userId, timeLeft: nextTimeLeft }) => {
      setSpeakingTurn(userId);
      setTimeLeft(nextTimeLeft);
    });

    socket.on("turn-ended", () => {
      setSpeakingTurn(null);
      setTimeLeft(0);
    });

    socket.on("webrtc-offer", async ({ offer, caller }) => {
      if (!caller?.socketId) {
        return;
      }

      const connection = createPeerConnection(caller);
      await connection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);

      socket.emit("webrtc-answer", {
        targetSocketId: caller.socketId,
        answer
      });
    });

    socket.on("webrtc-answer", async ({ answer, sourceSocketId }) => {
      const connection = peerConnectionsRef.current[sourceSocketId];
      if (!connection) {
        return;
      }

      await connection.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on("webrtc-ice-candidate", async ({ candidate, sourceSocketId }) => {
      const connection = peerConnectionsRef.current[sourceSocketId];
      if (!connection || !candidate) {
        return;
      }

      try {
        await connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("Failed to add ICE candidate", error);
      }
    });

    socket.on("live-debate-message", (message) => {
      setVoiceMessages((prev) => upsertVoiceMessage(prev, message));
    });

    return () => {
      socket.disconnect();
      cleanupRoomSession();
    };
  }, [cleanupPeerConnections, cleanupRoomSession, createOfferForParticipant, createPeerConnection, currentUser, removePeer]);

  const ensureLocalMedia = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Media devices are not supported in this browser.");
    }

    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    localStreamRef.current = stream;

    setIsMuted(false);
    return stream;
  };

  const handleStart = (id) => {
    setActiveDebateId(id);
    setStartTime(new Date());
  };

  const handleEnd = () => {
    setEndTime(new Date());
    setActiveDebateId(null);
  };

  const handleSubmit = (debate) => {
    if (!startTime || !endTime) {
      alert("Please start and end the debate before submitting");
      return;
    }

    const performedMinutes = Math.round((endTime - startTime) / 60000);
    if (performedMinutes <= 0 || Number.isNaN(performedMinutes)) {
      alert("Invalid debate duration. Please ensure you started and ended the debate properly.");
      return;
    }

    const submission = {
      debate_id: debate.id,
      user_id: currentUser.id,
      team_name: currentUser.team_name,
      start_time: startTime.toISOString().slice(0, 19).replace("T", " "),
      end_time: endTime.toISOString().slice(0, 19).replace("T", " "),
      performed_minutes: performedMinutes
    };

    api.post("/submission/submit", submission)
      .then(() => {
        setAssignedDebates((prev) =>
          prev.map((entry) =>
            entry.id === debate.id ? { ...entry, status: "SUBMITTED" } : entry
          )
        );
        alert("Debate submitted successfully");
        setStartTime(null);
        setEndTime(null);
      })
      .catch((err) => {
        console.error("Submission error:", err.response?.data);
        alert(err.response?.data?.message || "Submission failed");
      });
  };

  const joinRoom = async (debateId) => {
    if (!socketRef.current || !currentUser) {
      return;
    }

    try {
      setCallError("");
      setVoiceMessageError("");
      setCurrentDebateId(debateId);
      await ensureLocalMedia();
      await loadVoiceMessages(debateId);

      socketRef.current.emit("join-room", {
        roomId: `debate-${debateId}`,
        userId: currentUser.id,
        userName: currentUser.name,
        teamName: currentUser.team_name,
        role: currentUser.role
      });
    } catch (error) {
      console.error("Media access error:", error);
      setCurrentDebateId(null);
      setCallError("Microphone access was denied. Enable permissions and try again.");
    }
  };

  const leaveRoom = () => {
    if (socketRef.current && joinedRoomRef.current) {
      socketRef.current.emit("leave-room");
    }

    cleanupRoomSession();
    setInRoom(false);
    setCurrentRoom(null);
    joinedRoomRef.current = null;
    setParticipants([]);
    setSpeakingTurn(null);
    setTimeLeft(0);
    setVoiceMessages([]);
    setCurrentDebateId(null);
    setVoiceMessageError("");
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream || !socketRef.current) {
      return;
    }

    const nextMuted = !isMuted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);

    socketRef.current.emit("toggle-media", {
      muted: nextMuted
    });
  };

  const requestTurn = () => {
    if (!socketRef.current) {
      return;
    }

    socketRef.current.emit("request-turn");
  };

  const startVoiceMessageRecording = async () => {
    if (isRecordingVoiceMessage || isSavingVoiceMessage || !currentDebateId || !currentRoom) {
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setVoiceMessageError("Voice message recording is not supported in this browser.");
      return;
    }

    try {
      setVoiceMessageError("");
      await ensureLocalMedia();

      const mimeType = getSupportedRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(localStreamRef.current, { mimeType })
        : new MediaRecorder(localStreamRef.current);

      recordingChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      shouldPersistRecordingRef.current = true;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const shouldPersist = shouldPersistRecordingRef.current;
        const startedAt = recordingStartedAtRef.current;
        const chunks = [...recordingChunksRef.current];

        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        recordingStartedAtRef.current = null;
        shouldPersistRecordingRef.current = false;
        setIsRecordingVoiceMessage(false);

        if (!shouldPersist) {
          setIsSavingVoiceMessage(false);
          return;
        }

        if (!chunks.length) {
          setVoiceMessageError("No audio was captured. Try recording again.");
          setIsSavingVoiceMessage(false);
          return;
        }

        try {
          setIsSavingVoiceMessage(true);

          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          const audioData = await blobToDataUrl(blob);
          const durationSeconds = startedAt
            ? Math.max(1, Math.round((Date.now() - startedAt) / 1000))
            : null;

          const response = await api.post("/live-debate-messages", {
            debate_id: currentDebateId,
            room_id: currentRoom,
            user_id: currentUser.id,
            user_name: currentUser.name,
            team_name: currentUser.team_name,
            audio_data: audioData,
            mime_type: blob.type || recorder.mimeType || null,
            duration_seconds: durationSeconds
          });

          setVoiceMessages((prev) => upsertVoiceMessage(prev, response.data));
        } catch (error) {
          console.error("Failed to save live debate voice message:", error);
          setVoiceMessageError(
            error.response?.data?.message || "Unable to save your voice message."
          );
        } finally {
          setIsSavingVoiceMessage(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecordingVoiceMessage(true);
    } catch (error) {
      console.error("Voice recording error:", error);
      setVoiceMessageError("Unable to start voice recording.");
    }
  };

  const stopVoiceMessageRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      return;
    }

    mediaRecorderRef.current.stop();
  };

  const handleActionKeyDown = (event, action) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      action();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/debater/login");
  };

  return (
    <div className="content debater-dashboard-content">
      <div className="dashboard-heading">
        <div>
          <h2>Debater Dashboard</h2>
          <p className="dashboard-subtitle">Assigned debates, AI preview, and live audio in one compact view.</p>
          <p className="dashboard-user-meta">
            Logged in team: <strong>{currentUser?.team_name || "Unknown"}</strong>
          </p>
        </div>
        <button type="button" className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <AssignedTopicAIDebateShowcase
        assignedDebates={assignedDebates}
        currentUser={currentUser}
      />

      {inRoom && (
        <section className="live-room">
          <div className="live-room-header">
            <div className="room-title-block">
              <h3>Live Debate Room</h3>
              <p>{currentRoom}</p>
            </div>
            <div className="room-controls">
              <button type="button" onClick={toggleMute} onKeyDown={(event) => handleActionKeyDown(event, toggleMute)}>
                {isMuted ? "Unmute Mic" : "Mute Mic"}
              </button>
              <button type="button" onClick={requestTurn} onKeyDown={(event) => handleActionKeyDown(event, requestTurn)}>Request Turn</button>
              <button
                type="button"
                onClick={isRecordingVoiceMessage ? stopVoiceMessageRecording : startVoiceMessageRecording}
                onKeyDown={(event) => handleActionKeyDown(event, isRecordingVoiceMessage ? stopVoiceMessageRecording : startVoiceMessageRecording)}
              >
                {isRecordingVoiceMessage ? "Stop & Save Clip" : "Record Voice Clip"}
              </button>
              <button type="button" className="danger-btn" onClick={leaveRoom} onKeyDown={(event) => handleActionKeyDown(event, leaveRoom)}>Leave Audio</button>
            </div>
          </div>

          <div className="voice-message-toolbar">
            <span className={`recording-badge ${isRecordingVoiceMessage ? "recording-live" : ""}`}>
              {isRecordingVoiceMessage ? "Recording now" : "Recorder ready"}
            </span>
            {isSavingVoiceMessage && <span className="voice-message-status">Saving voice clip...</span>}
            {!isSavingVoiceMessage && voiceMessages.length > 0 && (
              <span className="voice-message-status">{voiceMessages.length} saved clips in this debate</span>
            )}
          </div>

          <div className="audio-grid">
            <div className="audio-tile local">
              <div className="audio-meta">
                <span>You</span>
                <span>{currentUser?.team_name || ""}</span>
                <span>{isMuted ? "Mic Off" : "Mic On"}</span>
              </div>
            </div>

            {remotePeers.map((peer) => (
              <RemoteAudioTile key={peer.socketId} peer={peer} />
            ))}
          </div>

          <div className="live-room-footer">
            <div className="participants">
              <h4>Participants ({participants.length})</h4>
              <div className="participant-list">
                {participants.map((participant) => (
                  <div
                    key={participant.socketId}
                    className={`participant-pill ${speakingTurn === participant.userId ? "active-speaker" : ""}`}
                  >
                    <span>{participant.userName}</span>
                    <span>{participant.teamName}</span>
                    <span>{participant.muted ? "Mic Off" : "Mic On"}</span>
                  </div>
                ))}
              </div>
            </div>

            {speakingTurn && (
              <div className="speaking-turn-card">
                <strong>
                  Current Speaker: {participants.find((item) => item.userId === speakingTurn)?.userName || "Unknown"}
                </strong>
                <span>Time Left: {timeLeft}s</span>
              </div>
            )}
          </div>

          <div className="voice-message-panel">
            <div className="voice-message-panel-header">
              <div>
                <h4>Saved Voice Messages</h4>
                <p>Recorded clips are stored for this debate and replayable by participants who join later.</p>
              </div>
            </div>

            {voiceMessages.length === 0 ? (
              <p className="voice-message-empty">No saved voice clips yet.</p>
            ) : (
              <div className="voice-message-feed">
                {voiceMessages.map((message) => (
                  <article key={message.id} className="voice-message-card">
                    <div className="voice-message-card-top">
                      <div>
                        <strong>{message.user_id === currentUser?.id ? "You" : message.user_name}</strong>
                        <span>{message.team_name || "No team"}</span>
                      </div>
                      <div className="voice-message-card-meta">
                        <span>{formatDuration(message.duration_seconds)}</span>
                        <span>{formatVoiceTimestamp(message.created_at)}</span>
                      </div>
                    </div>
                    <audio controls preload="none" src={message.audio_data} />
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {callError && <p className="call-error">{callError}</p>}
      {voiceMessageError && <p className="call-error">{voiceMessageError}</p>}

      {assignedDebates.length === 0 && (
        <p className="empty-state">No debates assigned to your team</p>
      )}

      {assignedDebates.map((debate) => (
        <div key={debate.id} className="debate-card compact-debate-card">
          <div className="debate-card-top">
            <div>
              <h3>{debate.title}</h3>
              <div className="compact-debate-meta-grid">
                <p className="debate-meta"><b>Topic:</b> {debate.topic || debate.title}</p>
                <p className="debate-meta"><b>Teams:</b> {debate.team_pair}</p>
                <p className="debate-meta"><b>Date:</b> {debate.debate_date}</p>
                <p className="debate-meta"><b>Duration:</b> {debate.duration} min</p>
              </div>
            </div>
            <span className={`status-pill ${debate.status === "SUBMITTED" ? "status-submitted" : "status-pending"}`}>
              {debate.status === "SUBMITTED" ? "SUBMITTED" : "NOT SUBMITTED"}
            </span>
          </div>

          {debate.status !== "SUBMITTED" && (
            <>
              <div className="btn-row">
                <button type="button" onClick={() => handleStart(debate.id)} onKeyDown={(event) => handleActionKeyDown(event, () => handleStart(debate.id))}>Start Human Debate</button>
                <button type="button" onClick={handleEnd} onKeyDown={(event) => handleActionKeyDown(event, handleEnd)}>End Human Debate</button>
                <button type="button" onClick={() => handleSubmit(debate)} onKeyDown={(event) => handleActionKeyDown(event, () => handleSubmit(debate))}>Submit Human Debate</button>
                {!inRoom && <button type="button" className="primary-btn" onClick={() => joinRoom(debate.id)} onKeyDown={(event) => handleActionKeyDown(event, () => joinRoom(debate.id))}>Join Human Live Audio</button>}
              </div>

              {activeDebateId === debate.id && (
                <div className="timer-shell">
                  <Timer minutes={parseInt(debate.duration, 10)} />
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function AssignedTopicAIDebateShowcase({ assignedDebates, currentUser }) {
  const fallbackDebates = useMemo(
    () => assignedDebates.map((debate) => buildAiDebateFromAssignedDebate(debate, currentUser?.team_name)),
    [assignedDebates, currentUser]
  );
  const [generatedDebates, setGeneratedDebates] = useState({});
  const [selectedDebateId, setSelectedDebateId] = useState("");
  const [activeTurnIndex, setActiveTurnIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const speechUtteranceRef = useRef(null);
  const requestPayload = useMemo(() => {
    const assignedDebate = assignedDebates.find((debate) => String(debate.id) === String(selectedDebateId));
    if (!assignedDebate) {
      return null;
    }

    return {
      title: assignedDebate.title,
      topic: getTopicLabel(assignedDebate),
      team_pair: assignedDebate.team_pair,
      team_name: currentUser?.team_name || "",
      duration: assignedDebate.duration
    };
  }, [assignedDebates, currentUser, selectedDebateId]);

  const selectedDebate = useMemo(
    () => {
      const selectedAssignedDebate = assignedDebates.find(
        (debate) => String(debate.id) === String(selectedDebateId)
      );

      if (!selectedAssignedDebate) {
        return fallbackDebates[0] || null;
      }

      return generatedDebates[selectedAssignedDebate.id] ||
        fallbackDebates.find((debate) => debate.id === selectedAssignedDebate.id) ||
        null;
    },
    [assignedDebates, fallbackDebates, generatedDebates, selectedDebateId]
  );

  useEffect(() => {
    if (!fallbackDebates.length) {
      setSelectedDebateId("");
      return;
    }

    const stillExists = fallbackDebates.some((debate) => String(debate.id) === String(selectedDebateId));
    if (!stillExists) {
      setSelectedDebateId(String(fallbackDebates[0].id));
    }
  }, [fallbackDebates, selectedDebateId]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speechUtteranceRef.current = null;
  }, []);

  const getPreferredVoice = useCallback((turn) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) {
      return null;
    }

    const maleHints = ["david", "mark", "george", "guy", "male", "man", "boy", "james", "tom", "daniel"];
    const femaleHints = ["zira", "susan", "samantha", "victoria", "female", "woman", "girl", "karen", "aria", "ava"];
    const preferredHints = turn.side === "Proposition" ? maleHints : femaleHints;
    const fallbackHints = turn.side === "Proposition" ? femaleHints : maleHints;

    const findMatchingVoice = (hints) =>
      voices.find((voice) => {
        const label = `${voice.name || ""} ${voice.voiceURI || ""}`.toLowerCase();
        return hints.some((hint) => label.includes(hint));
      });

    return findMatchingVoice(preferredHints) || findMatchingVoice(fallbackHints) || voices[0];
  }, []);

  const speakTurn = useCallback((turn, onEnd) => {
    stopSpeaking();

    const utterance = new window.SpeechSynthesisUtterance(turn.text);
    utterance.voice = getPreferredVoice(turn);
    utterance.rate = turn.side === "Proposition" ? 0.98 : 1;
    utterance.pitch = turn.side === "Proposition" ? 0.88 : 1.18;
    utterance.onend = () => {
      speechUtteranceRef.current = null;
      if (typeof onEnd === "function") {
        onEnd();
      }
    };
    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [getPreferredVoice, stopSpeaking]);

  useEffect(() => {
    setIsVoiceSupported(
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined"
    );
  }, []);

  useEffect(() => {
    if (!selectedDebateId) {
      return undefined;
    }

    const assignedDebate = assignedDebates.find((debate) => String(debate.id) === String(selectedDebateId));
    if (!assignedDebate || !requestPayload) {
      return undefined;
    }

    if (generatedDebates[assignedDebate.id]) {
      if (isVoiceSupported) {
        stopSpeaking();
        setActiveTurnIndex(0);
        setIsAutoPlaying(true);
      }
      return undefined;
    }

    let cancelled = false;

    const loadGeneratedDebate = async () => {
      try {
        setIsGenerating(true);
        setGenerationError("");
        stopSpeaking();
        setIsAutoPlaying(false);
        setActiveTurnIndex(0);

        const response = await requestGeneratedDebate(requestPayload);

        if (cancelled) {
          return;
        }

        setGeneratedDebates((prev) => ({
          ...prev,
          [assignedDebate.id]: {
            ...response.data,
            id: assignedDebate.id
          }
        }));

        if (isVoiceSupported) {
          setActiveTurnIndex(0);
          setIsAutoPlaying(true);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to generate Gemini debate:", error);
        setGenerationError(
          error.response?.data?.message || "Gemini could not generate the debate right now."
        );
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    };

    loadGeneratedDebate();

    return () => {
      cancelled = true;
    };
  }, [assignedDebates, generatedDebates, isVoiceSupported, requestPayload, selectedDebateId, stopSpeaking]);

  useEffect(() => {
    setActiveTurnIndex(0);
    setIsAutoPlaying(false);
    stopSpeaking();
  }, [selectedDebateId, stopSpeaking]);

  useEffect(() => () => stopSpeaking(), [stopSpeaking]);

  useEffect(() => {
    if (!selectedDebate || !isAutoPlaying || !isVoiceSupported) {
      return undefined;
    }

    const turns = selectedDebate.turns;
    if (activeTurnIndex >= turns.length) {
      setIsAutoPlaying(false);
      return undefined;
    }

    const turn = turns[activeTurnIndex];
    speakTurn(turn, () => {
      const nextTurnIndex = activeTurnIndex + 1;
      if (nextTurnIndex < turns.length) {
        setTimeout(() => {
          setActiveTurnIndex(nextTurnIndex);
        }, 350);
      } else {
        setIsAutoPlaying(false);
      }
    });

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeTurnIndex, isAutoPlaying, isVoiceSupported, selectedDebate, speakTurn]);

  function handlePreviewTurn(turn, turnIndex) {
    setIsAutoPlaying(false);
    setActiveTurnIndex(turnIndex);

    if (isVoiceSupported) {
      speakTurn(turn);
    }
  }

  function handleAutoPlay() {
    if (!selectedDebate || !isVoiceSupported) {
      return;
    }

    stopSpeaking();
    setActiveTurnIndex(0);
    setIsAutoPlaying(true);
  }

  if (!fallbackDebates.length) {
    return (
      <section className="mock-debate-panel">
        <div className="mock-debate-header">
          <div>
            <span className="mock-debate-eyebrow">AI Debate Queue</span>
            <h3>AI preview for assigned debates</h3>
            <p>Preview the opening AI round before the human debate starts.</p>
          </div>
        </div>
        <p className="empty-state">No team topics are assigned yet.</p>
      </section>
    );
  }

  return (
    <section className="mock-debate-panel compact-ai-panel">
      <div className="mock-debate-header">
        <div>
          <span className="mock-debate-eyebrow">AI Debate Queue</span>
          <h3>AI opening round</h3>
          <p>Small preview before the live debate.</p>
        </div>
        <div className="mock-debate-actions">
          <button type="button" onClick={handleAutoPlay} disabled={!isVoiceSupported}>
            Play
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              setIsAutoPlaying(false);
              stopSpeaking();
            }}
            disabled={!isVoiceSupported}
          >
            Stop
          </button>
        </div>
      </div>

      {isGenerating && (
        <p className="mock-voice-note">
          Gemini is generating the AI debate for the selected team topic.
        </p>
      )}

      {generationError && (
        <p className="call-error">{generationError}</p>
      )}

      {!isVoiceSupported && (
        <p className="mock-voice-note">
          Voice preview is unavailable in this browser. The mock transcript still shows the
          Gemini-style interaction flow.
        </p>
      )}

      <div className="mock-debate-layout">
        <div className="mock-debate-stage">
          <div className="form-row compact-ai-select-row">
            <select
              value={selectedDebateId}
              onChange={(event) => setSelectedDebateId(event.target.value)}
            >
              {fallbackDebates.map((debate) => (
                <option key={debate.id} value={debate.id}>
                  {debate.topic}
                </option>
              ))}
            </select>
          </div>

          <div className="mock-stage-topline">
            <div>
              <h4>{selectedDebate.title}</h4>
              <p>{selectedDebate.topic}</p>
            </div>
            <span className="mock-status-pill">{selectedDebate.status}</span>
          </div>

          <div className="mock-transcript">
            {selectedDebate.turns.map((turn, index) => (
              <article
                key={`${selectedDebate.id}-${index}`}
                className={`mock-turn ${activeTurnIndex === index ? "is-current" : ""}`}
              >
                <div className="mock-turn-header">
                  <div>
                    <span className={`mock-turn-side ${turn.side.toLowerCase()}`}>{turn.side}</span>
                    <strong>{turn.speaker}</strong>
                  </div>
                  <button
                    type="button"
                    className="turn-preview-button"
                    onClick={() => handlePreviewTurn(turn, index)}
                    disabled={!isVoiceSupported}
                  >
                    Preview Voice
                  </button>
                </div>
                <p>{turn.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function buildAiDebateFromAssignedDebate(debate, teamName) {
  const topic = getTopicLabel(debate);
  const safeTeamName = teamName || "Your Team";
  const [teamOne = "Team One", teamTwo = "Team Two"] = String(debate.team_pair || "")
    .split(" vs ")
    .map((entry) => entry.trim());
  const rivalTeamName = teamOne === safeTeamName ? teamTwo : teamOne;

  return {
    id: debate.id,
    topic,
    title: debate.title || topic,
    prompt: `Opening AI debate for ${debate.team_pair} on the assigned topic: ${topic}.`,
    status: "AI debate runs first, human debate follows",
    models: {
      pro: `${safeTeamName} AI Strategist`,
      opp: `${rivalTeamName || "Opponent"} AI Strategist`
    },
    turns: buildAiDebateTurns(topic, safeTeamName, rivalTeamName || "Opponent")
  };
}

function buildAiDebateTurns(topic, teamName, rivalTeamName) {
  return [
    {
      side: "Proposition",
      speaker: `${teamName} AI Strategist`,
      text: `${teamName} opens by arguing that ${topic.toLowerCase()} because the strongest case is built on impact, feasibility, and long-term value.`
    },
    {
      side: "Opposition",
      speaker: `${rivalTeamName} AI Strategist`,
      text: `${rivalTeamName} responds that ${topic.toLowerCase()} should be challenged because hidden tradeoffs, implementation risks, and fairness concerns still matter.`
    },
    {
      side: "Proposition",
      speaker: `${teamName} AI Strategist`,
      text: `${teamName} rebuts by narrowing the claim to practical benefits, measurable outcomes, and a clearer policy path on ${topic.toLowerCase()}.`
    },
    {
      side: "Opposition",
      speaker: `${rivalTeamName} AI Strategist`,
      text: `${rivalTeamName} closes the AI round by arguing that the better debate standard is caution, evidence, and stronger safeguards before accepting ${topic.toLowerCase()}.`
    }
  ];
}

function getTopicLabel(debate) {
  const topic = String(debate?.topic || "").trim();
  if (topic) {
    return topic;
  }

  const title = String(debate?.title || "").trim();
  if (title) {
    return title;
  }

  return "Assigned Debate Topic";
}

async function requestGeneratedDebate(payload) {
  try {
    return await api.post("/ai-debates/generate", payload);
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }

    return api.post("/debates/generate-ai", payload);
  }
}

function RemoteAudioTile({ peer }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="audio-tile">
      <audio ref={audioRef} autoPlay playsInline />
      <div className="audio-meta">
        <span>{peer.userName}</span>
        <span>{peer.teamName}</span>
        <span>Live Audio</span>
      </div>
    </div>
  );
}

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }

  const mimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus"
  ];

  return mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function upsertVoiceMessage(messages, nextMessage) {
  if (!nextMessage?.id) {
    return messages;
  }

  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);
  if (existingIndex === -1) {
    return [...messages, nextMessage];
  }

  const nextMessages = [...messages];
  nextMessages[existingIndex] = nextMessage;
  return nextMessages;
}

function formatVoiceTimestamp(value) {
  if (!value) {
    return "Just now";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Just now";
  }

  return parsedDate.toLocaleString();
}

function formatDuration(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Clip";
  }

  return `${seconds}s`;
}
