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

  insertTeams();
});

function insertTeams() {
  const teams = [
    'Team Alpha',
    'Team Beta',
    'Team Gamma',
    'Team Delta',
    'Team Sigma',
    'Team Omega',
    'Team Phoenix',
    'Team Titan',
    'Team Orion',
    'Team Nova'
  ];

  const insertSQL = 'INSERT IGNORE INTO teams (name, created_by) VALUES (?, 1)'; // Assuming admin id 1

  let inserted = 0;
  teams.forEach((team, index) => {
    connection.query(insertSQL, [team], (err) => {
      if (err) {
        console.error(`Error inserting ${team}:`, err);
      } else {
        console.log(`Inserted ${team}`);
        inserted++;
      }

      if (index === teams.length - 1) {
        console.log(`\nInserted ${inserted} teams.`);
        connection.end();
      }
    });
  });
}
