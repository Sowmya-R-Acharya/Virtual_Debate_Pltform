const liveDebateMessageModel = require("../models/liveDebateMessageModel");

exports.getMessages = (req, res) => {
  const debateId = Number(req.params.debateId);

  if (!Number.isInteger(debateId) || debateId <= 0) {
    return res.status(400).json({ message: "Valid debate ID is required" });
  }

  liveDebateMessageModel.getMessagesByDebateId(debateId, (err, rows) => {
    if (err) {
      console.error("FETCH LIVE DEBATE MESSAGES ERROR:", err);
      return res.status(500).json({ message: "Failed to load live debate messages" });
    }

    return res.json(rows);
  });
};

exports.createMessage = (req, res) => {
  const {
    debate_id,
    room_id,
    user_id,
    user_name,
    team_name,
    audio_data,
    mime_type,
    duration_seconds
  } = req.body;

  if (!debate_id || !room_id || !user_id || !user_name || !audio_data) {
    return res.status(400).json({ message: "Missing required voice message fields" });
  }

  if (typeof audio_data !== "string" || !audio_data.startsWith("data:audio")) {
    return res.status(400).json({ message: "Voice message audio must be a valid audio data URL" });
  }

  if (audio_data.length > 16 * 1024 * 1024) {
    return res.status(413).json({ message: "Voice message is too large" });
  }

  const message = {
    debate_id: Number(debate_id),
    room_id: String(room_id),
    user_id: Number(user_id),
    user_name: String(user_name),
    team_name: team_name ? String(team_name) : "",
    audio_data,
    mime_type: mime_type ? String(mime_type) : null,
    duration_seconds:
      duration_seconds !== undefined && duration_seconds !== null
        ? Number(duration_seconds)
        : null
  };

  liveDebateMessageModel.createMessage(message, (err, result) => {
    if (err) {
      console.error("CREATE LIVE DEBATE MESSAGE ERROR:", err);
      return res.status(500).json({ message: "Failed to save live debate voice message" });
    }

    liveDebateMessageModel.getMessageById(result.insertId, (fetchErr, rows) => {
      if (fetchErr || !rows?.length) {
        console.error("FETCH SAVED LIVE DEBATE MESSAGE ERROR:", fetchErr);
        return res.status(500).json({ message: "Voice message was saved but could not be loaded" });
      }

      const savedMessage = rows[0];
      const io = req.app.get("io");

      if (io) {
        io.to(savedMessage.room_id).emit("live-debate-message", savedMessage);
      }

      return res.status(201).json(savedMessage);
    });
  });
};
