const db = require('./config/db');

db.query('SELECT id, name, email, role FROM users WHERE role = ?', ['ADMIN'], (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Users with role ADMIN:', rows);
  }
  process.exit();
});
