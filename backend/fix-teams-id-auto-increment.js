const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixTeamsIdAutoIncrement() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Srujan@123",
    database: process.env.DB_NAME || "debate_platform"
  });

  try {
    console.log("Checking teams.id column...");
    const [columns] = await connection.query("SHOW COLUMNS FROM teams LIKE 'id'");

    if (!columns.length) {
      throw new Error("teams.id column not found");
    }

    const idColumn = columns[0];
    const hasAutoIncrement =
      typeof idColumn.Extra === "string" && idColumn.Extra.toLowerCase().includes("auto_increment");

    if (hasAutoIncrement) {
      console.log("teams.id already has AUTO_INCREMENT. Nothing to change.");
      return;
    }

    console.log("Checking PRIMARY KEY on teams...");
    const [indexes] = await connection.query("SHOW INDEX FROM teams WHERE Key_name = 'PRIMARY'");
    if (!indexes.length) {
      console.log("Adding PRIMARY KEY (id) on teams...");
      await connection.query("ALTER TABLE teams ADD PRIMARY KEY (id)");
    }

    console.log("Fixing teams.id to AUTO_INCREMENT...");
    await connection.query("ALTER TABLE teams MODIFY id INT NOT NULL AUTO_INCREMENT");

    const [updatedColumns] = await connection.query("SHOW COLUMNS FROM teams LIKE 'id'");
    const updatedIdColumn = updatedColumns[0];
    const updatedHasAutoIncrement =
      typeof updatedIdColumn.Extra === "string" &&
      updatedIdColumn.Extra.toLowerCase().includes("auto_increment");

    if (!updatedHasAutoIncrement) {
      throw new Error("teams.id was not updated to AUTO_INCREMENT");
    }

    console.log("Updated successfully: teams.id is now AUTO_INCREMENT.");
  } catch (error) {
    console.error("Error fixing teams.id AUTO_INCREMENT:", error.message);
  } finally {
    await connection.end();
  }
}

fixTeamsIdAutoIncrement();
