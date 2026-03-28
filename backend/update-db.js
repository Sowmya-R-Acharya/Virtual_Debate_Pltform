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

  createTeamsTable();
});

// ✅ Step 1 — Create teams table
function createTeamsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  console.log('\nCreating teams table...');

  connection.query(createTableSQL, (err) => {
    if (err) {
      console.error('Error creating teams table:', err);
      connection.end();
      return;
    }

    console.log('Teams table created successfully!');
    createResultsTable();
  });
}

// ✅ Step 2 — Create results table
function createResultsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      debate_id INT NOT NULL,
      winning_team VARCHAR(255) NOT NULL,
      average_rating DECIMAL(5,2) NULL,
      published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (debate_id) REFERENCES debates(id) ON DELETE CASCADE,
      INDEX idx_debate_id (debate_id),
      INDEX idx_published_at (published_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  console.log('\nCreating results table...');

  connection.query(createTableSQL, (err) => {
    if (err) {
      console.error('Error creating results table:', err.message);
    } else {
      console.log('Results table created successfully!');
    }
    finish();
  });
}

// ✅ Finish
function finish() {
  console.log('\n🎉 Database schema updated successfully!');
  console.log('You can now restart your backend server.');
  connection.end();
}
