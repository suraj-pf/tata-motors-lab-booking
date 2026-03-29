const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function debugAuth() {
  console.log('🔐 Debugging Authentication...\n');

  // Test JWT
  console.log('JWT Secret:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
  
  const testUser = { id: 1, username: 'test', role: 'user' };
  const token = jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '1h' });
  console.log('Token generation: ✅ Success');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verification: ✅ Success');
    console.log('Decoded payload:', decoded);
  } catch (e) {
    console.log('Token verification: ❌ Failed', e.message);
  }

  // Test bcrypt
  console.log('\nTesting password hashing...');
  const password = 'test123';
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash generation: ✅ Success');
  
  const match = await bcrypt.compare(password, hash);
  console.log('Password comparison:', match ? '✅ Correct' : '❌ Incorrect');
}

debugAuth();
