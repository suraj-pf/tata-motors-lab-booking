const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugSQL() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lab_booking_system'
  });

  console.log('🔍 Debugging SQL Queries...\n');

  // Test 1: Simple query
  console.log('Test 1: Simple SELECT');
  try {
    const [result] = await pool.execute('SELECT 1 + 1 as sum');
    console.log('✅ Passed:', result[0]);
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Test 2: Parameterized query
  console.log('\nTest 2: Parameterized query');
  try {
    const [result] = await pool.execute('SELECT ? + ? as sum', [5, 3]);
    console.log('✅ Passed:', result[0]);
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Test 3: JOIN query
  console.log('\nTest 3: JOIN query');
  try {
    const [result] = await pool.execute(`
      SELECT b.*, l.name 
      FROM bookings b 
      LEFT JOIN labs l ON b.lab_id = l.id 
      LIMIT 1
    `);
    console.log('✅ Passed, rows:', result.length);
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  // Test 4: LIMIT with parameter (problematic)
  console.log('\nTest 4: LIMIT with parameter');
  try {
    const [result] = await pool.execute('SELECT * FROM users LIMIT ?', [5]);
    console.log('✅ Passed:', result.length, 'rows');
  } catch (e) {
    console.log('❌ Failed:', e.message);
    console.log('   Solution: Use hardcoded LIMIT instead of parameter');
  }

  // Test 5: Hardcoded LIMIT
  console.log('\nTest 5: Hardcoded LIMIT');
  try {
    const [result] = await pool.execute('SELECT * FROM users LIMIT 5');
    console.log('✅ Passed:', result.length, 'rows');
  } catch (e) {
    console.log('❌ Failed:', e.message);
  }

  await pool.end();
}

debugSQL();
