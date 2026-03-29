const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lab_booking_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const cleanAllTestData = async () => {
  let db;
  try {
    // Connect to database
    db = await mysql.createPool(dbConfig);
    console.log('✅ Connected to database');

    console.log('🗑️  Starting comprehensive test data cleanup...\n');

    // 1. Remove all bookings (these are likely test bookings)
    console.log('1️⃣ Cleaning bookings table...');
    const [bookingsBefore] = await db.execute("SELECT COUNT(*) as count FROM bookings");
    console.log(`   📊 Found ${bookingsBefore[0].count} bookings`);
    
    const [bookingResult] = await db.execute("DELETE FROM bookings");
    console.log(`   ✅ Removed ${bookingResult.affectedRows} bookings`);

    // 2. Remove audit logs (these are typically test/development logs)
    console.log('\n2️⃣ Cleaning audit logs table...');
    const [auditBefore] = await db.execute("SELECT COUNT(*) as count FROM audit_logs");
    console.log(`   📊 Found ${auditBefore[0].count} audit logs`);
    
    const [auditResult] = await db.execute("DELETE FROM audit_logs");
    console.log(`   ✅ Removed ${auditResult.affectedRows} audit logs`);

    // 3. Remove notifications (these are likely test notifications)
    console.log('\n3️⃣ Cleaning notifications table...');
    const [notificationsBefore] = await db.execute("SELECT COUNT(*) as count FROM notifications");
    console.log(`   📊 Found ${notificationsBefore[0].count} notifications`);
    
    const [notificationResult] = await db.execute("DELETE FROM notifications");
    console.log(`   ✅ Removed ${notificationResult.affectedRows} notifications`);

    // 4. Remove blocked slots (these are likely test blocks)
    console.log('\n4️⃣ Cleaning blocked slots table...');
    const [blockedBefore] = await db.execute("SELECT COUNT(*) as count FROM blocked_slots");
    console.log(`   📊 Found ${blockedBefore[0].count} blocked slots`);
    
    const [blockedResult] = await db.execute("DELETE FROM blocked_slots");
    console.log(`   ✅ Removed ${blockedResult.affectedRows} blocked slots`);

    // 5. Check and optionally reset auto-increment values
    console.log('\n5️⃣ Resetting auto-increment values...');
    await db.execute("ALTER TABLE bookings AUTO_INCREMENT = 1");
    await db.execute("ALTER TABLE audit_logs AUTO_INCREMENT = 1");
    await db.execute("ALTER TABLE notifications AUTO_INCREMENT = 1");
    await db.execute("ALTER TABLE blocked_slots AUTO_INCREMENT = 1");
    console.log('   ✅ Auto-increment values reset to 1');

    // 6. Show remaining essential data
    console.log('\n6️⃣ Verifying essential data remains...');
    
    const [usersCount] = await db.execute("SELECT COUNT(*) as count FROM users");
    console.log(`   👥 Users: ${usersCount[0].count} (preserved)`);
    
    const [labsCount] = await db.execute("SELECT COUNT(*) as count FROM labs");
    console.log(`   🏢 Labs: ${labsCount[0].count} (preserved)`);

    // Show users and labs summary
    const [users] = await db.execute("SELECT username, name, role FROM users ORDER BY role, username");
    console.log('\n📋 Users Summary:');
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.name}) - ${user.role}`);
    });

    const [labs] = await db.execute("SELECT name, building, is_active FROM labs ORDER BY building, name");
    console.log('\n🏢 Labs Summary:');
    labs.forEach(lab => {
      console.log(`   - ${lab.name} (${lab.building}) - ${lab.is_active ? 'Active' : 'Inactive'}`);
    });

    console.log('\n✅ All test data cleanup completed successfully!');
    console.log('🎯 System is now clean and ready for production use.');
    console.log('\n📊 Summary:');
    console.log(`   - Bookings removed: ${bookingResult.affectedRows}`);
    console.log(`   - Audit logs removed: ${auditResult.affectedRows}`);
    console.log(`   - Notifications removed: ${notificationResult.affectedRows}`);
    console.log(`   - Blocked slots removed: ${blockedResult.affectedRows}`);
    console.log(`   - Users preserved: ${usersCount[0].count}`);
    console.log(`   - Labs preserved: ${labsCount[0].count}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
      console.log('\n📡 Database connection closed');
    }
  }
};

// Also create a function to completely reset the database (more aggressive)
const completeReset = async () => {
  let db;
  try {
    // Connect to database
    db = await mysql.createPool(dbConfig);
    console.log('✅ Connected to database');

    console.log('⚠️  WARNING: Starting COMPLETE database reset...');
    console.log('   This will remove ALL data except users and labs structure!\n');

    // Truncate all tables except users and labs
    const tables = [
      'bookings',
      'audit_logs', 
      'notifications',
      'blocked_slots'
    ];

    for (const table of tables) {
      console.log(`🗑️  Truncating ${table}...`);
      await db.execute(`TRUNCATE TABLE ${table}`);
      console.log(`   ✅ ${table} truncated`);
    }

    // Reset auto-increment values
    console.log('\n🔄 Resetting auto-increment values...');
    for (const table of tables) {
      await db.execute(`ALTER TABLE ${table} AUTO_INCREMENT = 1`);
    }
    console.log('   ✅ All auto-increment values reset');

    console.log('\n✅ Complete database reset finished!');
    console.log('🎯 System is now in a clean state, ready for fresh data.');

  } catch (error) {
    console.error('❌ Error during reset:', error.message);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
      console.log('\n📡 Database connection closed');
    }
  }
};

// Run the cleanup
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--complete-reset')) {
    console.log('🔥 COMPLETE RESET MODE');
    console.log('⚠️  This will remove ALL data from transaction tables!\n');
    completeReset();
  } else if (args.includes('--dry-run')) {
    console.log('🔍 DRY RUN MODE - Showing what would be removed...');
    // Add dry run logic here if needed
  } else {
    console.log('🧹 CLEAN TEST DATA MODE');
    console.log('   Use --complete-reset for full truncation\n');
    cleanAllTestData();
  }
}

module.exports = { cleanAllTestData, completeReset };
