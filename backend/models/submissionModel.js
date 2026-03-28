const db = require("../config/db");

/* ================= ADMIN ================= */
exports.getSubmittedDebates = (callback) => {
  const sql = `
    SELECT 
      s.id,
      s.debate_id,
      s.team_name,
      s.performed_minutes,
      s.status,
      s.submitted_at,
      s.voice_audio,
      s.voice_transcript,
      s.voice_message,
      d.title,
      d.team_pair,
      d.debate_date,
      d.duration
    FROM submissions s
    LEFT JOIN debates d ON s.debate_id = d.id
    WHERE s.status = 'SUBMITTED'
    ORDER BY s.submitted_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("SQL ERROR:", err.sqlMessage);
      return callback(err, []);
    }
    callback(null, rows);
  });
};

/* ================= DEBATER ================= */
exports.submitDebate = (data, callback) => {
  const sql = `
    INSERT INTO submissions
    (debate_id, team_name, performed_minutes, voice_audio, voice_transcript, status)
    VALUES (?, ?, ?, ?, ?, 'SUBMITTED')
  `;

  db.query(
    sql,
    [
      data.debate_id,
      data.team_name,
      data.performed_minutes,
      data.voice_audio,
      data.voice_transcript
    ],
    (err, result) => {
      if (err) {
        console.error("INSERT ERROR:", err.sqlMessage);
        return callback(err);
      }
      callback(null, result);
    }
  );
};

/* ================= ADMIN ACTIONS ================= */
exports.updateSubmissionStatus = (id, status, callback) => {
  db.query(
    "UPDATE submissions SET status = ? WHERE id = ?",
    [status, id],
    callback
  );
};

exports.deleteSubmission = (id, callback) => {
  db.query(
    "DELETE FROM submissions WHERE id = ?",
    [id],
    callback
  );
};
