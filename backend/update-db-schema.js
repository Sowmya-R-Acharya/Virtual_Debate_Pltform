const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'Srujan@123',
  database: 'debate_platform'
};

const connection = mysql.createConnection(dbConfig);

console.log('Connecting to database...');

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  console.log('Connected to database successfully!');

  updateUserTable();
});

function updateUserTable() {
  // Find any UNIQUE index that is only on the email column, then drop it.
  const findEmailUniqueSQL = `
    SELECT s.INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS s
    JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS c
      ON s.TABLE_SCHEMA = c.TABLE_SCHEMA
     AND s.TABLE_NAME = c.TABLE_NAME
     AND s.INDEX_NAME = c.CONSTRAINT_NAME
    WHERE s.TABLE_SCHEMA = DATABASE()
      AND s.TABLE_NAME = 'users'
      AND c.CONSTRAINT_TYPE = 'UNIQUE'
    GROUP BY s.INDEX_NAME
    HAVING SUM(s.COLUMN_NAME = 'email') = 1 AND COUNT(*) = 1
  `;

  console.log('\nChecking for UNIQUE index on email...');

  connection.query(findEmailUniqueSQL, (err, rows) => {
    if (err) {
      console.error('Error checking unique indexes:', err);
      connection.end();
      return;
    }

    const emailIndex = rows.length ? rows[0].INDEX_NAME : null;

    const dropEmailIndex = (cb) => {
      if (!emailIndex) return cb();
      console.log(`Dropping unique index on email: ${emailIndex}...`);
      connection.query(`ALTER TABLE users DROP INDEX \`${emailIndex}\`;`, (dropErr) => {
        if (dropErr) {
          console.error('Error dropping email unique index:', dropErr);
          connection.end();
          return;
        }
        console.log('Email unique index dropped successfully!');
        cb();
      });
    };

    dropEmailIndex(() => {
      // Add new unique key on (email, role) if it doesn't exist
      const findCompositeSQL = `
        SELECT s.INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS s
        JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS c
          ON s.TABLE_SCHEMA = c.TABLE_SCHEMA
         AND s.TABLE_NAME = c.TABLE_NAME
         AND s.INDEX_NAME = c.CONSTRAINT_NAME
        WHERE s.TABLE_SCHEMA = DATABASE()
          AND s.TABLE_NAME = 'users'
          AND c.CONSTRAINT_TYPE = 'UNIQUE'
        GROUP BY s.INDEX_NAME
        HAVING SUM(s.COLUMN_NAME = 'email') = 1
           AND SUM(s.COLUMN_NAME = 'role') = 1
           AND COUNT(*) = 2
      `;

      console.log('Checking for UNIQUE (email, role)...');
      connection.query(findCompositeSQL, (findErr, compositeRows) => {
        if (findErr) {
          console.error('Error checking composite index:', findErr);
          connection.end();
          return;
        }
        if (compositeRows.length) {
          console.log('Unique key (email, role) already exists.');
          finish();
          return;
        }

        const addUniqueSQL = `ALTER TABLE users ADD UNIQUE KEY email_role (email, role);`;
        console.log('Adding unique key on (email, role)...');
        connection.query(addUniqueSQL, (addErr) => {
          if (addErr) {
            console.error('Error adding unique key:', addErr);
            connection.end();
            return;
          }
          console.log('Unique key added successfully!');
          finish();
        });
      });
    });
  });
}

function finish() {
  console.log('\n🎉 Database schema updated successfully!');
  console.log('Users can now register with the same email for different roles.');
  connection.end();
}
