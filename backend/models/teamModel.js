const db = require("../config/db");
const DEFAULT_TEAMS = [
  "Team Alpha",
  "Team Beta",
  "Team Gamma",
  "Team Delta",
  "Team Sigma",
  "Team Omega",
  "Team Phoenix",
  "Team Titan",
  "Team Orion",
  "Team Nova"
];

function ensureTeamsTable(callback) {
  const sql = `
    CREATE TABLE IF NOT EXISTS teams (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      created_by INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  db.query(sql, callback);
}

function normalizeTeamName(name) {
  return String(name || "").trim();
}

function parseTeamPair(teamPair) {
  return String(teamPair || "")
    .split(/\s+vs\s+/i)
    .map((teamName) => normalizeTeamName(teamName))
    .filter(Boolean);
}

function buildUniqueTeamNames(names) {
  const seen = new Set();
  return names.filter((name) => {
    const normalized = normalizeTeamName(name);
    if (!normalized) {
      return false;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getOptionalRows(sql, callback) {
  db.query(sql, (err, rows) => {
    if (err) {
      console.warn(`Optional team recovery query failed: ${sql}`, err.message);
      callback(null, []);
      return;
    }

    callback(null, Array.isArray(rows) ? rows : []);
  });
}

exports.createTeam = (team, callback) => {
  const sql = "INSERT INTO teams (name, created_by) VALUES (?, ?)";
  db.query(sql, [team.name, team.created_by], callback);
};

exports.getAllTeams = (callback) => {
  ensureTeamsTable((ensureErr) => {
    if (ensureErr) {
      callback(ensureErr);
      return;
    }

    const sql = "SELECT id, name FROM teams ORDER BY name ASC";
    db.query(sql, callback);
  });
};

exports.getAllTeamsOrSeedDefaults = (callback) => {
  exports.getAllTeams((err, rows) => {
    if (err) {
      callback(err);
      return;
    }

    getOptionalRows("SELECT team_pair FROM debates", (_, debateRows) => {
      getOptionalRows(
        "SELECT DISTINCT team_name FROM users WHERE team_name IS NOT NULL AND TRIM(team_name) <> ''",
        (_, userRows) => {
          const existingTeams = Array.isArray(rows) ? rows : [];
          const debateTeamNames = debateRows.reduce((names, row) => {
            return names.concat(parseTeamPair(row.team_pair));
          }, []);
          const combinedTeamNames = buildUniqueTeamNames([
            ...existingTeams.map((team) => team.name),
            ...DEFAULT_TEAMS,
            ...debateTeamNames,
            ...userRows.map((row) => row.team_name)
          ]);

          const existingNameSet = new Set(
            existingTeams.map((team) => normalizeTeamName(team.name).toLowerCase())
          );

          const missingNames = combinedTeamNames.filter(
            (name) => !existingNameSet.has(normalizeTeamName(name).toLowerCase())
          );

          if (!missingNames.length) {
            callback(null, existingTeams);
            return;
          }

          const values = missingNames.map((name) => [name, 0]);
          db.query(
            "INSERT INTO teams (name, created_by) VALUES ?",
            [values],
            (insertErr) => {
              if (insertErr) {
                callback(insertErr);
                return;
              }

              exports.getAllTeams(callback);
            }
          );
        }
      );
    });
  });
};

exports.deleteTeam = (id, callback) => {
  const sql = "DELETE FROM teams WHERE id = ?";
  db.query(sql, [id], callback);
};
