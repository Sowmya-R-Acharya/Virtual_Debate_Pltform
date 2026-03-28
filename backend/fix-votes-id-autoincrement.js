const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixVotesIdAutoIncrement() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Srujan@123",
    database: process.env.DB_NAME || "debate_platform"
  });

  try {
    console.log("Inspecting votes.id column...");
    const [rows] = await connection.query("SHOW COLUMNS FROM votes LIKE 'id'");

    if (!rows.length) {
      throw new Error("votes.id column not found");
    }

    const idCol = rows[0];
    const hasAutoIncrement = typeof idCol.Extra === "string" && idCol.Extra.includes("auto_increment");

    if (hasAutoIncrement) {
      console.log("votes.id already has AUTO_INCREMENT.");
      return;
    }

    console.log("Fixing votes.id to AUTO_INCREMENT...");
    await connection.query("ALTER TABLE votes MODIFY id INT NOT NULL AUTO_INCREMENT");
    console.log("votes.id is now AUTO_INCREMENT.");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await connection.end();
  }
}

fixVotesIdAutoIncrement();
