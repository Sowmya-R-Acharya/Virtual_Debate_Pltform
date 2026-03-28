const db = require("../config/db");

let voteColumnsCache = null;

function getVoteColumns(forceRefresh, callback) {
  if (!forceRefresh && voteColumnsCache) {
    return callback(null, voteColumnsCache);
  }

  db.query("SHOW COLUMNS FROM votes", (err, rows) => {
    if (err) return callback(err);

    voteColumnsCache = new Set(rows.map((r) => r.Field));
    callback(null, voteColumnsCache);
  });
}

exports.submitVote = (vote, callback) => {
  const runInsert = (columns, retried = false) => {
    const insertColumns = ["debate_id", "rating"];
    const values = [vote.debate_id, vote.rating];

    if (columns.has("user_id")) {
      insertColumns.push("user_id");
      values.push(vote.user_id || null);
    }

    if (columns.has("team_voted")) {
      insertColumns.push("team_voted");
      values.push(vote.team_voted || vote.team_name || null);
    } else if (columns.has("team_name")) {
      insertColumns.push("team_name");
      values.push(vote.team_name || vote.team_voted || null);
    }

    if (columns.has("comment")) {
      insertColumns.push("comment");
      values.push(vote.comment || null);
    }

    if (columns.has("voice_audio")) {
      insertColumns.push("voice_audio");
      values.push(vote.voice_audio || null);
    }

    if (columns.has("voice_transcript")) {
      insertColumns.push("voice_transcript");
      values.push(vote.voice_transcript || null);
    }

    if (columns.has("voice_message")) {
      insertColumns.push("voice_message");
      values.push(vote.voice_message || vote.voice_transcript || vote.voice_audio || null);
    }

    const placeholders = insertColumns.map(() => "?").join(", ");
    const sql = `INSERT INTO votes (${insertColumns.join(", ")}) VALUES (${placeholders})`;

    db.query(sql, values, (err, result) => {
      if (err) {
        if (!retried && err.code === "ER_BAD_FIELD_ERROR") {
          return getVoteColumns(true, (refreshErr, refreshedColumns) => {
            if (refreshErr) return callback(refreshErr);
            return runInsert(refreshedColumns, true);
          });
        }

        return callback(err);
      }

      callback(null, result);
    });
  };

  getVoteColumns(false, (colErr, columns) => {
    if (colErr) return callback(colErr);
    return runInsert(columns);
  });
};

exports.checkUserVote = (debateId, userId, callback) => {
  getVoteColumns(false, (colErr, columns) => {
    if (colErr) return callback(colErr);

    if (!columns.has("user_id")) {
      // Legacy schema does not track voter identity; cannot block duplicates reliably.
      return callback(null, false);
    }

    const sql = `SELECT COUNT(*) AS count FROM votes WHERE debate_id = ? AND user_id = ?`;
    db.query(sql, [debateId, userId], (err, rows) => {
      if (err) return callback(err);
      callback(null, rows[0].count > 0);
    });
  });
};

exports.getVotesByDebate = (debateId, callback) => {
  getVoteColumns(false, (colErr, columns) => {
    if (colErr) return callback(colErr);

    const teamColumnExpr = columns.has("team_voted")
      ? "team_voted"
      : (columns.has("team_name") ? "team_name" : "NULL");

    const sql = `
      SELECT ${teamColumnExpr} AS team_voted, COUNT(*) AS vote_count, AVG(rating) AS average_rating
      FROM votes
      WHERE debate_id = ?
      GROUP BY ${teamColumnExpr}
    `;

    db.query(sql, [debateId], callback);
  });
};

exports.getVoteDetailsByDebate = (debateId, callback) => {
  getVoteColumns(false, (colErr, columns) => {
    if (colErr) return callback(colErr);

    const teamExpr = columns.has("team_voted")
      ? "team_voted AS team_voted"
      : (columns.has("team_name") ? "team_name AS team_voted" : "NULL AS team_voted");
    const commentExpr = columns.has("comment") ? "comment" : "NULL AS comment";

    const sql = `
      SELECT
        id,
        debate_id,
        ${teamExpr},
        rating,
        ${commentExpr},
        voted_at
      FROM votes
      WHERE debate_id = ?
      ORDER BY voted_at DESC
    `;

    db.query(sql, [debateId], callback);
  });
};

exports.getAllVotes = (callback) => {
  getVoteColumns(false, (colErr, columns) => {
    if (colErr) return callback(colErr);

    const teamExpr = columns.has("team_voted")
      ? "v.team_voted"
      : (columns.has("team_name") ? "v.team_name AS team_voted" : "NULL AS team_voted");
    const userExpr = columns.has("user_id") ? "v.user_id" : "NULL AS user_id";
    const voiceMsgExpr = columns.has("voice_message") ? "v.voice_message" : "NULL AS voice_message";
    const voiceAudioExpr = columns.has("voice_audio") ? "v.voice_audio" : "NULL AS voice_audio";
    const voiceTranscriptExpr = columns.has("voice_transcript") ? "v.voice_transcript" : "NULL AS voice_transcript";
    const userJoin = columns.has("user_id")
      ? "LEFT JOIN users u ON u.id = v.user_id"
      : "";
    const userNameExpr = columns.has("user_id") ? "u.name AS voter_name" : "NULL AS voter_name";
    const userEmailExpr = columns.has("user_id") ? "u.email AS voter_email" : "NULL AS voter_email";
    const userRoleExpr = columns.has("user_id") ? "u.role AS voter_role" : "NULL AS voter_role";
    const userSlotExpr = columns.has("user_id") ? "u.slot AS voter_slot" : "NULL AS voter_slot";

    const sql = `
      SELECT
        v.id,
        v.debate_id,
        ${userExpr},
        ${teamExpr},
        v.rating,
        v.comment,
        ${voiceMsgExpr},
        ${voiceAudioExpr},
        ${voiceTranscriptExpr},
        v.voted_at,
        d.title AS debate_title,
        d.team_pair,
        d.status AS debate_status,
        ${userNameExpr},
        ${userEmailExpr},
        ${userRoleExpr},
        ${userSlotExpr}
      FROM votes v
      JOIN debates d ON d.id = v.debate_id
      ${userJoin}
      ORDER BY v.voted_at DESC
    `;
    db.query(sql, callback);
  });
};

exports.deleteVote = (voteId, callback) => {
  const sql = `
    DELETE FROM votes
    WHERE id = ?
  `;
  db.query(sql, [voteId], callback);
};
