const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lab_booking_system'
});

connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Solution: Check if MySQL is running and credentials are correct');
    process.exit(1);
  }
  console.log('✅ Database connected successfully');
  console.log('📊 Server version:', connection.serverVersion);
  
  connection.query('SHOW DATABASES', (err, results) => {
    if (err) throw err;
    console.log('\n📚 Available databases:');
    results.forEach(db => console.log('   -', db.Database));
    connection.end();
  });
});
