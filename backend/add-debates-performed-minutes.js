const db = require('./config/db');

db.getConnection((err, connection) => {
  if (err) {
    console.error('DB Connection error:', err);
    return;
  }

  connection.query("SHOW COLUMNS FROM debates LIKE 'performed_minutes'", (colErr, columns) => {
    if (colErr) {
      console.error('Check column error:', colErr);
      connection.release();
      return;
    }

    if (columns.length > 0) {
      console.log('✅ performed_minutes column already exists in debates table');
      connection.release();
      return;
    }

    console.log('Adding performed_minutes column to debates...');
    connection.query("ALTER TABLE debates ADD COLUMN performed_minutes INT(11) DEFAULT NULL", (alterErr, result) => {
      if (alterErr) {
        console.error('ALTER TABLE error:', alterErr);
      } else {
        console.log('✅ Added performed_minutes column to debates table');
      }
      connection.release();
    });
  });
});
