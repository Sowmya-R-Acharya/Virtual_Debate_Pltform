const db = require("../config/db");

let submissionColumnsCache = null;

function getSubmissionColumns(forceRefresh, callback) {
  if (!forceRefresh && submissionColumnsCache) {
    return callback(null, submissionColumnsCache);
  }

  db.query("SHOW COLUMNS FROM submissions", (err, rows) => {
    if (err) return callback(err);

    submissionColumnsCache = new Set(rows.map((r) => r.Field));
    callback(null, submissionColumnsCache);
  });
}

/* ================= ADMIN ================= */
exports.getSubmittedDebates = (req, res) => {
  getSubmissionColumns(false, (colErr, columns) => {
    if (colErr) {
      console.error("FETCH SUBMISSIONS ERROR:", colErr);
      return res.status(500).json([]);
    }

    const voiceAudioExpr = columns.has("voice_audio")
      ? "s.voice_audio"
      : "NULL AS voice_audio";
    const voiceTranscriptExpr = columns.has("voice_transcript")
      ? "s.voice_transcript"
      : "NULL AS voice_transcript";
    const voiceMessageExpr = columns.has("voice_message")
      ? "s.voice_message"
      : "NULL AS voice_message";

    const sql = `
      SELECT 
        s.id AS submission_id,
        s.team_name,
        s.performed_minutes,
        s.status AS submission_status,
        s.submitted_at,
        ${voiceAudioExpr},
        ${voiceTranscriptExpr},
        ${voiceMessageExpr},

        d.title,
        d.team_pair,
        d.debate_date,
        d.duration
      FROM submissions s
      JOIN debates d ON d.id = s.debate_id
      WHERE s.status = 'SUBMITTED'
      ORDER BY s.submitted_at DESC
    `;

    db.query(sql, (err, rows) => {
      if (err) {
        console.error("FETCH SUBMISSIONS ERROR:", err);
        return res.status(500).json([]);
      }

      res.json(rows); // ALWAYS ARRAY
    });
  });
};

/* ================= GET ALL SUBMISSIONS (INCLUDING PAST) ================= */
exports.getAllSubmissions = (req, res) => {
  getSubmissionColumns(false, (colErr, columns) => {
    if (colErr) {
      console.error("FETCH ALL SUBMISSIONS ERROR:", colErr);
      return res.status(500).json([]);
    }

    const voiceAudioExpr = columns.has("voice_audio")
      ? "s.voice_audio"
      : "NULL AS voice_audio";
    const voiceTranscriptExpr = columns.has("voice_transcript")
      ? "s.voice_transcript"
      : "NULL AS voice_transcript";
    const voiceMessageExpr = columns.has("voice_message")
      ? "s.voice_message"
      : "NULL AS voice_message";

    const sql = `
      SELECT 
        s.id AS submission_id,
        s.team_name,
        s.performed_minutes,
        s.status AS submission_status,
        s.submitted_at,
        ${voiceAudioExpr},
        ${voiceTranscriptExpr},
        ${voiceMessageExpr},

        d.title,
        d.team_pair,
        d.debate_date,
        d.duration
      FROM submissions s
      JOIN debates d ON d.id = s.debate_id
      ORDER BY s.submitted_at DESC
    `;

    db.query(sql, (err, rows) => {
      if (err) {
        console.error("FETCH ALL SUBMISSIONS ERROR:", err);
        return res.status(500).json([]);
      }

      res.json(rows); // ALWAYS ARRAY
    });
  });
};

/* ================= DEBATER ================= */
exports.submitDebate = (req, res) => {
  const {
    debate_id,
    user_id,
    team_name,
    start_time,
    end_time,
    performed_minutes,
    voice_audio,
    voice_transcript,
    voice_message
  } = req.body;

  console.log("Submission data:", {
    debate_id,
    user_id,
    team_name,
    start_time,
    end_time,
    performed_minutes,
    voice_audio: voice_audio ? "[audio]" : null,
    voice_transcript: voice_transcript ? "[transcript]" : null,
    voice_message: voice_message ? "[legacy]" : null
  });

  // Validate required fields
  if (!debate_id || !user_id || !team_name || !start_time || !end_time || performed_minutes === undefined) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  let normalizedVoiceAudio = voice_audio || null;
  let normalizedVoiceTranscript = voice_transcript || null;

  // Backward compatibility for legacy voice_message payloads
  if (!normalizedVoiceAudio && !normalizedVoiceTranscript && voice_message) {
    if (typeof voice_message === "string" && voice_message.startsWith("data:audio")) {
      normalizedVoiceAudio = voice_message;
    } else {
      normalizedVoiceTranscript = voice_message;
    }
  }

  const runInsert = (columns, retried = false) => {
    const insertColumns = [
      "debate_id",
      "user_id",
      "team_name",
      "start_time",
      "end_time",
      "performed_minutes"
    ];
    const values = [
      debate_id,
      user_id,
      team_name,
      start_time,
      end_time,
      performed_minutes
    ];

    if (columns.has("voice_audio")) {
      insertColumns.push("voice_audio");
      values.push(normalizedVoiceAudio);
    }

    if (columns.has("voice_transcript")) {
      insertColumns.push("voice_transcript");
      values.push(normalizedVoiceTranscript);
    }

    if (columns.has("voice_message")) {
      insertColumns.push("voice_message");
      values.push(normalizedVoiceTranscript || normalizedVoiceAudio || null);
    }

    if (columns.has("status")) {
      insertColumns.push("status");
      values.push("SUBMITTED");
    }

    const placeholders = insertColumns.map(() => "?").join(", ");
    const sql = `
      INSERT INTO submissions
      (${insertColumns.join(", ")})
      VALUES (${placeholders})
    `;

    db.query(
      sql,
      values,
      (err, result) => {
        if (err) {
          if (!retried && err.code === "ER_BAD_FIELD_ERROR") {
            return getSubmissionColumns(true, (refreshErr, refreshedColumns) => {
              if (refreshErr) {
                console.error("SUBMIT ERROR:", refreshErr);
                return res.status(500).json({ message: "Submission failed", error: refreshErr.message });
              }

              return runInsert(refreshedColumns, true);
            });
          }

          console.error("SUBMIT ERROR:", err);
          return res.status(500).json({ message: "Submission failed", error: err.message });
        }

        console.log("Submission successful, ID:", result.insertId);
        res.json({ message: "Debate submitted successfully" });
      }
    );
  };

  getSubmissionColumns(false, (colErr, columns) => {
    if (colErr) {
      console.error("SUBMIT ERROR:", colErr);
      return res.status(500).json({ message: "Submission failed", error: colErr.message });
    }

    return runInsert(columns);
  });
};

/* ================= ADMIN ACTIONS ================= */
exports.updateStatus = (req, res) => {
  const { status } = req.body;
  const submissionId = req.params.id;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  db.query(
    "SELECT debate_id FROM submissions WHERE id=?",
    [submissionId],
    (findErr, rows) => {
      if (findErr) return res.status(500).json({ message: "Update failed" });
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "Submission not found" });
      }

      const debateId = rows[0].debate_id;

      db.query(
        "UPDATE submissions SET status=? WHERE id=?",
        [status, submissionId],
        (subErr) => {
          if (subErr) return res.status(500).json({ message: "Update failed" });

          // NEW: Copy performed_minutes to debate if approved
          if (status === "APPROVED") {
            db.query("SELECT performed_minutes FROM submissions WHERE id=?", [submissionId], (selErr, subRows) => {
              if (!selErr && subRows[0] && subRows[0].performed_minutes !== null) {
                const performedMinutes = parseInt(subRows[0].performed_minutes);
                if (!isNaN(performedMinutes)) {
                  db.query(
                    "UPDATE debates SET performed_minutes = ? WHERE id = ?",
                    [performedMinutes, debateId],
                    (upErr) => {
                      if (upErr) console.error("Update performed_minutes failed:", upErr);
                      else console.log(`Updated debate ${debateId} performed_minutes: ${performedMinutes}`);
                    }
                  );
                }
              }
            });
          }

          // Keep debate visibility in sync with admin decision.
          const debateStatus = status === "APPROVED" ? "APPROVED" : "REJECTED";
          db.query(
            "UPDATE debates SET status=? WHERE id=?",
            [debateStatus, debateId],
            (debateErr) => {
              if (debateErr) return res.status(500).json({ message: "Update failed" });
              res.json({ message: "Status updated" });
            }
          );
        }
      );
    }
  );
};

exports.deleteSubmission = (req, res) => {
  db.query(
    "DELETE FROM submissions WHERE id=?",
    [req.params.id],
    err => {
      if (err) return res.status(500).json({ message: "Delete failed" });
      res.json({ message: "Submission deleted" });
    }
  );
};

