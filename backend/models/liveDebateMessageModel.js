const db = require("../config/db");

exports.getMessagesByDebateId = (debateId, callback) => {
  const sql = `
    SELECT
      id,
      debate_id,
      room_id,
      user_id,
      user_name,
      team_name,
      audio_data,
      mime_type,
      duration_seconds,
      created_at
    FROM live_debate_messages
    WHERE debate_id = ?
    ORDER BY created_at ASC, id ASC
  `;

  db.query(sql, [debateId], callback);
};

exports.createMessage = (message, callback) => {
  const sql = `
    INSERT INTO live_debate_messages
    (
      debate_id,
      room_id,
      user_id,
      user_name,
      team_name,
      audio_data,
      mime_type,
      duration_seconds
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    message.debate_id,
    message.room_id,
    message.user_id,
    message.user_name,
    message.team_name,
    message.audio_data,
    message.mime_type,
    message.duration_seconds
  ];

  db.query(sql, values, callback);
};

exports.getMessageById = (id, callback) => {
  const sql = `
    SELECT
      id,
      debate_id,
      room_id,
      user_id,
      user_name,
      team_name,
      audio_data,
      mime_type,
      duration_seconds,
      created_at
    FROM live_debate_messages
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [id], callback);
};
