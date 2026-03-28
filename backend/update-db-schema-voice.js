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

  updateSubmissionsTable();
});

function updateSubmissionsTable() {
  const addVoiceAudioSQL = `ALTER TABLE submissions ADD COLUMN voice_audio MEDIUMTEXT DEFAULT NULL;`;
  const addVoiceTranscriptSQL = `ALTER TABLE submissions ADD COLUMN voice_transcript MEDIUMTEXT DEFAULT NULL;`;
  const addVoiceMessageSQL = `ALTER TABLE submissions ADD COLUMN voice_message TEXT DEFAULT NULL;`;

  console.log('\nAdding voice_audio column to submissions table...');

  connection.query(addVoiceAudioSQL, (err) => {
    if (err) {
      console.error('Error adding voice_audio to submissions:', err);
      connection.end();
      return;
    }

    console.log('voice_audio column added to submissions successfully!');
    console.log('Adding voice_transcript column to submissions table...');

    connection.query(addVoiceTranscriptSQL, (err2) => {
      if (err2) {
        console.error('Error adding voice_transcript to submissions:', err2);
        connection.end();
        return;
      }

      console.log('voice_transcript column added to submissions successfully!');
      console.log('Adding legacy voice_message column to submissions table...');

      connection.query(addVoiceMessageSQL, (err3) => {
        if (err3) {
          console.error('Error adding voice_message to submissions:', err3);
          connection.end();
          return;
        }

        console.log('voice_message column added to submissions successfully!');
        updateVotesTable();
      });
    });
  });
}

function updateVotesTable() {
  const addVoiceAudioSQL = `ALTER TABLE votes ADD COLUMN voice_audio MEDIUMTEXT DEFAULT NULL;`;
  const addVoiceTranscriptSQL = `ALTER TABLE votes ADD COLUMN voice_transcript MEDIUMTEXT DEFAULT NULL;`;
  const addVoiceMessageSQL = `ALTER TABLE votes ADD COLUMN voice_message TEXT DEFAULT NULL;`;

  console.log('Adding voice_audio column to votes table...');

  connection.query(addVoiceAudioSQL, (err) => {
    if (err) {
      console.error('Error adding voice_audio to votes:', err);
      connection.end();
      return;
    }

    console.log('voice_audio column added to votes successfully!');
    console.log('Adding voice_transcript column to votes table...');

    connection.query(addVoiceTranscriptSQL, (err2) => {
      if (err2) {
        console.error('Error adding voice_transcript to votes:', err2);
        connection.end();
        return;
      }

      console.log('voice_transcript column added to votes successfully!');
      console.log('Adding legacy voice_message column to votes table...');

      connection.query(addVoiceMessageSQL, (err3) => {
        if (err3) {
          console.error('Error adding voice_message to votes:', err3);
          connection.end();
          return;
        }

        console.log('voice_message column added to votes successfully!');
        finish();
      });
    });
  });
}

function finish() {
  console.log('\nðŸŽ‰ Database schema updated successfully!');
  console.log('Voice audio and transcripts can now be stored for submissions and votes.');
  connection.end();
}
