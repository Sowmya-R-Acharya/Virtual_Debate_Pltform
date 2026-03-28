const db = require("../config/db");

/* CREATE DEBATE */
exports.createDebate = (debate, cb) => {
  const sql = `
    INSERT INTO debates (title, topic, team_pair, debate_date, duration, status)
    VALUES (?, ?, ?, ?, ?, 'CREATED')
  `;

  db.query(
    sql,
    [debate.title, debate.topic, debate.teamPair, debate.date, debate.duration],
    cb
  );
};

/* GET ALL DEBATES (ADMIN) */
exports.getAllDebates = (cb) => {

  const sql = `
    SELECT 
      id,
      title,
      topic,
      team_pair,
      DATE_FORMAT(debate_date, '%Y-%m-%d') AS debate_date,
      duration,
      status,
      performed_minutes
    FROM debates
    ORDER BY id DESC
  `;

  db.query(sql, cb);
};

/* GET DEBATES BY TEAM (DEBATER) */
exports.getDebatesByTeam = (teamName, cb) => {
  const normalizedTeamName = String(teamName || "")
    .trim()
    .toLowerCase()
    .replace(/^team\s+/i, "");


  const sql = `
    SELECT
      id,
      title,
      topic,
      team_pair,
      DATE_FORMAT(debate_date, '%Y-%m-%d') AS debate_date,
      duration,
      status,
      performed_minutes
    FROM debates
    WHERE REPLACE(LOWER(team_pair), 'team ', '') LIKE ? OR REPLACE(LOWER(team_pair), 'team ', '') LIKE ?
  `;

  db.query(sql, [normalizedTeamName + ' vs %', '% vs ' + normalizedTeamName], cb);
};

/* DELETE DEBATE */
exports.deleteDebate = (id, cb) => {
  const sql = "DELETE FROM debates WHERE id = ?";
  db.query(sql, [id], cb);
};
