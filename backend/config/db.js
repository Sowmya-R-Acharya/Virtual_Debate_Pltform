require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require("mysql2");

// pool configuration with multipleStatements so we can import the SQL dump if needed
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Srujan@123",
  database: process.env.DB_NAME || "debate_platform",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

// helper: try to read and execute the schema dump
function importSchema(connection) {
  const sqlCandidates = [
    path.join(__dirname, '..', 'debate_platform.sql'),
    path.join(__dirname, '..', '..', 'debate_platform.sql')
  ];
  const sqlFile = sqlCandidates.find((candidate) => fs.existsSync(candidate));
  if (!sqlFile) {
    console.error('Could not find debate_platform.sql in expected locations:', sqlCandidates);
    if (connection) connection.release();
    return;
  }

  console.log('Attempting to import schema from', sqlFile);
  try {
    const schemaSql = fs.readFileSync(sqlFile, 'utf8');
    connection.query(schemaSql, (importErr) => {
      if (importErr) {
        console.error('Schema import failed:', importErr);
      } else {
        console.log('Database schema initialized from debate_platform.sql');
      }
      if (connection) connection.release();
    });
  } catch (fileErr) {
    console.error('Could not read schema file:', fileErr);
    if (connection) connection.release();
  }
}

function createUsersTable(connection) {
  const createUsersSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) DEFAULT NULL,
      email VARCHAR(100) NOT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('ADMIN','DEBATER','AUDIENCE') NOT NULL,
      team_name VARCHAR(100) DEFAULT NULL,
      slot VARCHAR(50) DEFAULT NULL,
      unique_scope VARCHAR(150) NOT NULL DEFAULT 'default',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_identity (email, role, unique_scope)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  connection.query(createUsersSql, (createErr) => {
    if (createErr) {
      console.error("Failed to auto-create 'users' table:", createErr);
      // Last fallback: try SQL dump import.
      importSchema(connection);
      return;
    }

    console.log("Auto-created missing 'users' table");
    ensureUsersTableSchema(connection);
  });
}

function ensureUsersRoleAwareUniqueIndex(connection) {
  connection.query("SHOW COLUMNS FROM users LIKE 'unique_scope'", (colErr, colRows) => {
    if (colErr) {
      console.error("Failed to inspect 'users.unique_scope' column:", colErr);
      if (connection) connection.release();
      return;
    }

    const continueWithIndexes = () => {
      connection.query("UPDATE users SET unique_scope = CASE WHEN role = 'DEBATER' THEN LOWER(TRIM(COALESCE(team_name, ''))) WHEN role = 'AUDIENCE' THEN LOWER(TRIM(COALESCE(slot, ''))) ELSE 'default' END WHERE unique_scope IS NULL OR unique_scope = ''", (updateErr) => {
        if (updateErr) {
          console.error("Failed to backfill users.unique_scope:", updateErr);
          if (connection) connection.release();
          return;
        }

        connection.query("SHOW INDEX FROM users WHERE Non_unique = 0", (idxErr, rows) => {
          if (idxErr) {
            console.error("Failed to inspect 'users' unique indexes:", idxErr);
            if (connection) connection.release();
            return;
          }

          const uniqueIndexes = new Map();
          rows.forEach((row) => {
            if (row.Key_name === "PRIMARY") return;
            if (!uniqueIndexes.has(row.Key_name)) uniqueIndexes.set(row.Key_name, []);
            uniqueIndexes.get(row.Key_name).push({
              column: String(row.Column_name || "").toLowerCase(),
              seq: Number(row.Seq_in_index || 0)
            });
          });

          const toDrop = [];
          let hasScopedUnique = false;

          uniqueIndexes.forEach((cols, keyName) => {
            const ordered = cols.sort((a, b) => a.seq - b.seq).map(c => c.column);
            if (
              (ordered.length === 1 && ordered[0] === "email") ||
              (ordered.length === 2 && ordered[0] === "email" && ordered[1] === "role")
            ) {
              toDrop.push(keyName);
            }
            if (
              ordered.length === 3 &&
              ordered[0] === "email" &&
              ordered[1] === "role" &&
              ordered[2] === "unique_scope"
            ) {
              hasScopedUnique = true;
            }
          });

          const runAddIfNeeded = () => {
            if (hasScopedUnique) {
              if (connection) connection.release();
              return;
            }

            connection.query(
              "ALTER TABLE users ADD UNIQUE KEY unique_user_identity (email, role, unique_scope)",
              (addErr) => {
                if (addErr) {
                  console.error("Failed to add unique (email, role, unique_scope) index:", addErr);
                } else {
                  console.log("Added users unique index: (email, role, unique_scope)");
                }
                if (connection) connection.release();
              }
            );
          };

          if (!toDrop.length) {
            runAddIfNeeded();
            return;
          }

          const dropNext = (i) => {
            if (i >= toDrop.length) {
              runAddIfNeeded();
              return;
            }

            connection.query(`ALTER TABLE users DROP INDEX \`${toDrop[i]}\``, (dropErr) => {
              if (dropErr) {
                console.error(`Failed to drop users index '${toDrop[i]}'`, dropErr);
              } else {
                console.log(`Dropped users index '${toDrop[i]}'`);
              }
              dropNext(i + 1);
            });
          };

          dropNext(0);
        });
      });
    };

    if (colRows.length > 0) {
      continueWithIndexes();
      return;
    }

    connection.query(
      "ALTER TABLE users ADD COLUMN unique_scope VARCHAR(150) NOT NULL DEFAULT 'default' AFTER slot",
      (alterErr) => {
        if (alterErr) {
          console.error("Failed to add 'users.unique_scope' column:", alterErr);
          if (connection) connection.release();
          return;
        }

        console.log("Added users.unique_scope column");
        continueWithIndexes();
      }
    );
  });
}

function ensureUsersTableSchema(connection) {
  connection.query("SHOW COLUMNS FROM users LIKE 'id'", (idErr, rows) => {
    if (idErr) {
      console.error("Failed to inspect 'users.id' column:", idErr);
      if (connection) connection.release();
      return;
    }

    const idCol = rows && rows[0];
    const hasAutoIncrement = idCol && typeof idCol.Extra === "string" && idCol.Extra.includes("auto_increment");
    if (hasAutoIncrement) {
      ensureUsersRoleAwareUniqueIndex(connection);
      return;
    }

    console.warn("'users.id' is missing AUTO_INCREMENT - fixing table schema");
    connection.query("ALTER TABLE users MODIFY id INT NOT NULL AUTO_INCREMENT", (alterErr) => {
      if (alterErr) {
        console.error("Failed to fix 'users.id' AUTO_INCREMENT:", alterErr);
        if (connection) connection.release();
      } else {
        console.log("Fixed 'users' table: id is now AUTO_INCREMENT");
        ensureUsersRoleAwareUniqueIndex(connection);
      }
    });
  });
}

function ensureTableIdAutoIncrement(tableName) {
  db.getConnection((err, connection) => {
    if (err) {
      console.error(`Failed to get connection for '${tableName}' schema check:`, err.message);
      return;
    }

    connection.query(`SHOW TABLES LIKE '${tableName}'`, (tableErr, tables) => {
      if (tableErr) {
        console.error(`Error checking for '${tableName}' table:`, tableErr);
        connection.release();
        return;
      }

      if (!tables.length) {
        connection.release();
        return;
      }

      connection.query(`SHOW COLUMNS FROM \`${tableName}\` LIKE 'id'`, (idErr, rows) => {
        if (idErr) {
          console.error(`Failed to inspect '${tableName}.id' column:`, idErr);
          connection.release();
          return;
        }

        const idCol = rows && rows[0];
        const hasAutoIncrement = idCol && typeof idCol.Extra === "string" && idCol.Extra.includes("auto_increment");
        if (hasAutoIncrement) {
          connection.release();
          return;
        }

        const applyAutoIncrement = () => {
          console.warn(`'${tableName}.id' is missing AUTO_INCREMENT - fixing table schema`);
          connection.query(`ALTER TABLE \`${tableName}\` MODIFY id INT NOT NULL AUTO_INCREMENT`, (alterErr) => {
            if (alterErr) {
              console.error(`Failed to fix '${tableName}.id' AUTO_INCREMENT:`, alterErr);
            } else {
              console.log(`Fixed '${tableName}' table: id is now AUTO_INCREMENT`);
            }
            connection.release();
          });
        };

        connection.query(
          `SHOW INDEX FROM \`${tableName}\` WHERE Key_name = 'PRIMARY'`,
          (idxErr, indexes) => {
            if (idxErr) {
              console.error(`Failed to inspect '${tableName}' primary key:`, idxErr);
              connection.release();
              return;
            }

            if (indexes && indexes.length > 0) {
              applyAutoIncrement();
              return;
            }

            console.warn(`'${tableName}' is missing a PRIMARY KEY on id - fixing table schema`);
            connection.query(`ALTER TABLE \`${tableName}\` ADD PRIMARY KEY (id)`, (pkErr) => {
              if (pkErr) {
                console.error(`Failed to add PRIMARY KEY on '${tableName}.id':`, pkErr);
                connection.release();
                return;
              }
              console.log(`Added PRIMARY KEY on '${tableName}.id'`);
              applyAutoIncrement();
            });
          }
        );
      });
    });
  });
}

function ensureLiveDebateMessagesTable() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS live_debate_messages (
      id INT NOT NULL AUTO_INCREMENT,
      debate_id INT NOT NULL,
      room_id VARCHAR(120) NOT NULL,
      user_id INT NOT NULL,
      user_name VARCHAR(100) NOT NULL,
      team_name VARCHAR(100) DEFAULT NULL,
      audio_data MEDIUMTEXT NOT NULL,
      mime_type VARCHAR(100) DEFAULT NULL,
      duration_seconds DECIMAL(8,2) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_live_debate_messages_debate_id (debate_id),
      KEY idx_live_debate_messages_room_id (room_id),
      KEY idx_live_debate_messages_user_id (user_id),
      CONSTRAINT fk_live_debate_messages_debate
        FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE,
      CONSTRAINT fk_live_debate_messages_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  db.query(createTableSql, (err) => {
    if (err) {
      console.error("Failed to ensure 'live_debate_messages' table:", err);
      return;
    }

    console.log("Ensured 'live_debate_messages' table exists");
  });
}

function ensureDebatesTopicColumn() {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Failed to get connection for 'debates' schema check:", err.message);
      return;
    }

    connection.query("SHOW TABLES LIKE 'debates'", (tableErr, tables) => {
      if (tableErr) {
        console.error("Error checking for 'debates' table:", tableErr);
        connection.release();
        return;
      }

      if (!tables.length) {
        connection.release();
        return;
      }

      connection.query("SHOW COLUMNS FROM debates LIKE 'topic'", (columnErr, columns) => {
        if (columnErr) {
          console.error("Failed to inspect 'debates.topic' column:", columnErr);
          connection.release();
          return;
        }

        if (columns.length > 0) {
          connection.release();
          return;
        }

        connection.query(
          "ALTER TABLE debates ADD COLUMN topic VARCHAR(255) NOT NULL DEFAULT '' AFTER title",
          (alterErr) => {
            if (alterErr) {
              console.error("Failed to add 'debates.topic' column:", alterErr);
            } else {
              console.log("Added debates.topic column");
            }
            connection.release();
          }
        );
      });
    });
  });
}

// Test the connection and ensure users table exists

db.getConnection((err, connection) => {
  if (err) {
    console.error(" DB Connection Failed:", err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') console.error('Database connection was closed.');
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') console.error('Database connection had a fatal error.');
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_QUILTING') console.error('Database connection was closed forcefully.');
    return;
  }

  connection.query("SHOW TABLES LIKE 'users'", (checkErr, rows) => {
    if (checkErr) {
      console.error('Error checking for users table:', checkErr);
    } else if (rows.length === 0) {
      console.warn("'users' table not found - creating it now");
      createUsersTable(connection);
      return; // createUsersTable/importSchema will release
    }
    ensureUsersTableSchema(connection);
  });

  console.log(" MySQL Connected");
});

ensureTableIdAutoIncrement("votes");
ensureTableIdAutoIncrement("teams");
ensureLiveDebateMessagesTable();
ensureDebatesTopicColumn();

module.exports = db;
