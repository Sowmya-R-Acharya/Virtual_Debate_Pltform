const bcrypt = require('bcryptjs');

const plain = 'admin123';
const hash = '$2a$08$...'; // replace with actual hash

console.log('Plain:', plain);
console.log('Hash:', hash);
console.log('Compare:', bcrypt.compareSync(plain, hash));
