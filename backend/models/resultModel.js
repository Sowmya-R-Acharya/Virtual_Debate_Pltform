const db = require("../config/db");

exports.publishResult = (result, callback) => {
  const avgRating = result.average_rating != null && !isNaN(result.average_rating)
    ? result.average_rating
    : null;

  db.query("DELETE FROM results WHERE debate_id = ?", [result.debate_id], (deleteErr) => {
    if (deleteErr) {
      callback(deleteErr);
      return;
    }

    const sql = `
      INSERT INTO results (debate_id, winning_team, average_rating)
      VALUES (?, ?, ?)
    `;

    db.query(
      sql,
      [result.debate_id, result.winning_team, avgRating],
      callback
    );
  });
};

exports.getLatest = callback => {
  const sql = `
    SELECT r.*, d.title AS debate_title, d.team_pair
    FROM results r
    JOIN debates d ON d.id = r.debate_id
    ORDER BY r.published_at DESC
    LIMIT 1
  `;
  db.query(sql, callback);
};

exports.getAllResults = callback => {
  const sql = `
    SELECT r.*, d.title AS debate_title, d.team_pair
    FROM results r
    JOIN debates d ON d.id = r.debate_id
    ORDER BY r.published_at DESC
  `;
  db.query(sql, callback);
};
