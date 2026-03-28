const db = require("../config/db");

function buildUniqueScope(user) {
  if (user.role === "DEBATER") {
    return (user.team_name || "").trim().toLowerCase();
  }

  if (user.role === "AUDIENCE") {
    return (user.slot || "").trim().toLowerCase();
  }

  return "default";
}

exports.createUser = (user, callback) => {
  const sql = `
    INSERT INTO users (name, email, password, role, team_name, slot, unique_scope)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(
    sql,
    [user.name, user.email, user.password, user.role, user.team_name, user.slot, buildUniqueScope(user)],
    callback
  );
};

exports.findUser = (email, role, options, callback) => {
  const params = [email, role];
  let sql = `
    SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND role = UPPER(?)
  `;

  if (role === "DEBATER" && options?.team_name) {
    sql += " AND LOWER(TRIM(team_name)) = LOWER(TRIM(?))";
    params.push(options.team_name);
  }

  if (role === "AUDIENCE" && options?.slot) {
    sql += " AND LOWER(TRIM(slot)) = LOWER(TRIM(?))";
    params.push(options.slot);
  }

  db.query(sql, params, callback);
};

exports.findUserByEmailAndRole = (email, role, callback) => {
  const sql = `
    SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND role = UPPER(?)
  `;
  db.query(sql, [email, role], callback);
};

exports.findUserByEmail = (email, callback) => {
  const sql = `
    SELECT * FROM users WHERE LOWER(email) = LOWER(?)
  `;
  db.query(sql, [email], callback);
};

exports.findUserBySlot = (email, role, slot, callback) => {
  const sql = `
    SELECT * FROM users WHERE LOWER(email) = LOWER(?) AND role = UPPER(?) AND slot = ?
  `;
  db.query(sql, [email, role, slot], callback);
};

exports.findUserBySlotOnly = (slot, role, callback) => {
  const sql = `
    SELECT * FROM users WHERE slot = ? AND role = ?
  `;
  db.query(sql, [slot, role], callback);
};
