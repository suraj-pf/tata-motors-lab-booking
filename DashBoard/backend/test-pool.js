const { pool } = require('./src/config/database');

async function testPool() {
  try {
    const [result] = await pool.execute('SELECT 1 + 1 as sum');
    console.log('✅ Pool query result:', result[0]);
    
    const [tables] = await pool.execute('SHOW TABLES');
    console.log('📊 Tables in database:');
    tables.forEach(t => console.log('   -', Object.values(t)[0]));
    
    await pool.end();
  } catch (err) {
    console.error('❌ Pool error:', err);
  }
}

testPool();
