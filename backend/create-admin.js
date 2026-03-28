const bcrypt = require('bcryptjs');
const db = require('./config/db');

const adminUser = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: bcrypt.hashSync('Admin123!', 8),
  role: 'ADMIN'
};

const sql = `
  INSERT INTO users (name, email, password, role)
  VALUES (?, ?, ?, ?)
  ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password = VALUES(password),
  role = VALUES(role)
`;

db.query(sql, [adminUser.name, adminUser.email, adminUser.password, adminUser.role], (err, result) => {
  if (err) {
    console.error('Error creating admin user:', err);
  } else {
    console.log('Admin user created/updated successfully!');
    console.log('Email: admin@example.com');
    console.log('Password: Admin123!');
    console.log('Role: ADMIN');
  }
  process.exit();
});
