const mysql = require('mysql2/promise');
require('dotenv').config();

async function testQuery() {
  console.log('===== TESTING DATABASE QUERY =====');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lab_booking_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // Test 1: Simple connection
    console.log('\n1. Testing connection...');
    const [testResult] = await pool.execute('SELECT 1 + 1 as result');
    console.log('✅ Connection OK:', testResult[0]);

    // Test 2: Get a user
    console.log('\n2. Getting a user...');
    const [users] = await pool.execute('SELECT id FROM users LIMIT 1');
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    const userId = users[0].id;
    console.log('✅ Found user ID:', userId);

    // Test 3: Test different parameter types for LIMIT
    console.log('\n3. Testing LIMIT with different parameter types...');
    
    const tests = [
      { name: 'Integer', value: 5 },
      { name: 'String', value: '5' },
      { name: 'Float', value: 5.0 },
      { name: 'String with CAST', value: '5', query: 'SELECT CAST(? AS UNSIGNED) as result' }
    ];

    for (const test of tests) {
      try {
        const query = test.query || 'SELECT ? as result';
        const [result] = await pool.execute(query, [test.value]);
        console.log(`   ✅ ${test.name}:`, result[0]);
      } catch (e) {
        console.log(`   ❌ ${test.name}:`, e.message);
      }
    }

    // Test 4: Test the actual booking query with different approaches
    console.log('\n4. Testing booking query...');

    // Approach A: Simple query without JOIN
    console.log('\n   A. Simple query without JOIN:');
    try {
      const [bookings] = await pool.execute(
        'SELECT * FROM bookings WHERE user_id = ? LIMIT ?',
        [userId, 5]
      );
      console.log('   ✅ Success, rows:', bookings.length);
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }

    // Approach B: With JOIN but simple LIMIT
    console.log('\n   B. Query with JOIN:');
    try {
      const [bookings] = await pool.execute(
        `SELECT b.*, l.name as lab_name 
         FROM bookings b 
         JOIN labs l ON b.lab_id = l.id 
         WHERE b.user_id = ? 
         LIMIT ?`,
        [userId, 5]
      );
      console.log('   ✅ Success, rows:', bookings.length);
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }

    // Approach C: Full query with LIMIT and OFFSET
    console.log('\n   C. Full query with LIMIT and OFFSET:');
    try {
      const [bookings] = await pool.execute(
        `SELECT b.*, l.name as lab_name 
         FROM bookings b 
         JOIN labs l ON b.lab_id = l.id 
         WHERE b.user_id = ? 
         ORDER BY b.booking_date DESC 
         LIMIT ? OFFSET ?`,
        [userId, 5, 0]
      );
      console.log('   ✅ Success, rows:', bookings.length);
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }

    // Approach D: Using CAST
    console.log('\n   D. Using CAST:');
    try {
      const [bookings] = await pool.execute(
        `SELECT b.*, l.name as lab_name 
         FROM bookings b 
         JOIN labs l ON b.lab_id = l.id 
         WHERE b.user_id = ? 
         ORDER BY b.booking_date DESC 
         LIMIT CAST(? AS UNSIGNED) OFFSET CAST(? AS UNSIGNED)`,
        [userId, '5', '0']
      );
      console.log('   ✅ Success, rows:', bookings.length);
    } catch (e) {
      console.log('   ❌ Failed:', e.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await pool.end();
  }
}

testQuery();