const jwt = require('jsonwebtoken');

// For testing purposes, using a default secret. In production, use process.env.JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_this_in_production';

// JWT payload structure (same as in authController)
const payload = {
  id: 1, // Replace with actual user ID
  role: 'admin' // Replace with 'ADMIN', 'DEBATER', or 'AUDIENCE'
};

// Generate token
const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

console.log('Generated JWT Token:');
console.log(token);
console.log('\nUse this token in the Authorization header as: Bearer ' + token);
console.log('\nTo generate tokens for different users, modify the payload above and run: node generate-jwt.js');
console.log('\nNote: Make sure your .env file has JWT_SECRET set for production use.');
