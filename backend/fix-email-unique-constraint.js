const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixEmailConstraint() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Srujan@123",
    database: process.env.DB_NAME || "debate_platform"
  });

  try {
    console.log("Checking current indexes on users table...");
    const [indexes] = await connection.query("SHOW INDEX FROM users");
    console.log("Current indexes:", indexes);

    console.log("Ensuring unique_scope column exists...");
    await connection.query(
      "ALTER TABLE users ADD COLUMN unique_scope VARCHAR(150) NOT NULL DEFAULT 'default'"
    ).catch((error) => {
      if (error.code !== "ER_DUP_FIELDNAME") {
        throw error;
      }
    });

    console.log("Backfilling unique_scope values...");
    await connection.query(`
      UPDATE users
      SET unique_scope = CASE
        WHEN role = 'DEBATER' THEN LOWER(TRIM(COALESCE(team_name, '')))
        WHEN role = 'AUDIENCE' THEN LOWER(TRIM(COALESCE(slot, '')))
        ELSE 'default'
      END
    `);

    console.log("Dropping legacy unique constraint on email+role...");
    await connection.query("ALTER TABLE users DROP INDEX unique_email_role").catch((error) => {
      if (error.code !== "ER_CANT_DROP_FIELD_OR_KEY" && error.code !== "ER_DROP_INDEX_FK") {
        throw error;
      }
    });

    console.log("Adding scoped unique constraint...");
    await connection.query(
      "ALTER TABLE users ADD UNIQUE KEY unique_user_identity (email, role, unique_scope)"
    ).catch((error) => {
      if (error.code !== "ER_DUP_KEYNAME") {
        throw error;
      }
    });

    const [newIndexes] = await connection.query("SHOW INDEX FROM users");
    console.log("Updated indexes:", newIndexes);

    console.log("\nDatabase updated successfully!");
    console.log("Same email is now allowed for different debater teams.");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await connection.end();
  }
}

fixEmailConstraint();
