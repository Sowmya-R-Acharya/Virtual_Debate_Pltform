const bcrypt = require('bcryptjs');
const db = require('./config/db');

console.log('Checking admin user...');

db.query('SELECT id, name, email, password, role FROM users WHERE email = ? AND role = ?', ['admin@example.com', 'ADMIN'], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  if (rows.length === 0) {
    console.log('No admin user found with email admin@example.com and role ADMIN');
    process.exit(1);
  }

  const admin = rows[0];
  console.log('Admin user found:', {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    password_hash: admin.password
  });

  // Test password
  const testPassword = 'admin123';
  const isValid = bcrypt.compareSync(testPassword, admin.password);
  console.log(`Password 'admin123' valid: ${isValid}`);

  process.exit(0);
});
