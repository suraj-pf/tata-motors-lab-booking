const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const PORT = 3000;

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

let db;

// Initialize Database Connection
const connectDB = async () => {
  try {
    // First connect without database to create it if needed
    const tempConnection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    // Create database if it doesn't exist
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log(`✅ Database '${dbConfig.database}' ready`);
    await tempConnection.end();
    
    // Now connect with database
    db = await mysql.createPool(dbConfig);
    console.log('✅ Database connection pool established');
    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize Schema and Tables
const initDB = async () => {
  try {
    // First establish connection
    await connectDB();

    console.log('📦 Checking and creating tables if not exist...');

    // ==================== USERS TABLE ====================
    // NOTE: Removed 'UNIQUE' from bc_number to allow duplicates (BC101 for all)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        bc_number VARCHAR(50) NOT NULL,
        department VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_bc_number (bc_number),
        INDEX idx_username (username),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Users table ready (BC Number uniqueness removed)');

    // ==================== LABS TABLE ====================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS labs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        building VARCHAR(100) NOT NULL,
        capacity INT NOT NULL,
        is_ac TINYINT(1) NOT NULL DEFAULT 0,
        facilities TEXT,
        lab_owner VARCHAR(100),
        hourly_charges DECIMAL(10,2) DEFAULT 0.0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_building (building),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Labs table ready');

    // ==================== BOOKINGS TABLE ====================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        lab_id INT NOT NULL,
        user_id INT NOT NULL,
        bc_number VARCHAR(50) NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        booking_date DATE NOT NULL,
        duration_hours DECIMAL(4,2) DEFAULT 1.0,
        purpose VARCHAR(255),
        status ENUM('confirmed', 'cancelled', 'completed', 'pending') DEFAULT 'confirmed',
        is_recurring BOOLEAN DEFAULT FALSE,
        recurring_days JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_lab_date (lab_id, booking_date),
        INDEX idx_user_id (user_id),
        INDEX idx_bc_number (bc_number),
        INDEX idx_status (status),
        INDEX idx_booking_date (booking_date),
        CONSTRAINT valid_time CHECK (start_time < end_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Bookings table ready');

    // ==================== NOTIFICATIONS TABLE ====================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_read (user_id, is_read),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Notifications table ready');

    // ==================== BLOCKED SLOTS TABLE ====================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS blocked_slots (
        id INT PRIMARY KEY AUTO_INCREMENT,
        lab_id INT NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        blocked_date DATE NOT NULL,
        reason TEXT,
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lab_id) REFERENCES labs(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_lab_date (lab_id, blocked_date),
        UNIQUE KEY unique_block (lab_id, blocked_date, start_time, end_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Blocked slots table ready');

    // ==================== AUDIT LOGS TABLE ====================
    await db.execute(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        lab_id INT,
        booking_id INT,
        old_data JSON,
        new_data JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_action (user_id, action),
        INDEX idx_booking_id (booking_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   ✅ Audit logs table ready');

    // ==================== SEED INITIAL DATA ====================
    console.log('\n🌱 Seeding initial data...');

    // Seed Users
    const [userRows] = await db.execute("SELECT COUNT(*) as count FROM users");
    if (userRows[0].count === 0) {
      console.log('   👥 Creating initial users...');
      
      // Admin user
      // Updated: BC Number to BC101, Department to SDC
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      await db.execute(
        "INSERT INTO users (username, password_hash, name, bc_number, department, role) VALUES (?, ?, ?, ?, ?, ?)",
        ["admin", hashedPassword, "System Administrator", "BC101", "SDC", "admin"]
      );
      console.log('      ✓ Admin user created (username: admin, password: admin123, BC: BC101, Dept: SDC)');
      
      // Staff users
      // Updated: All BC Numbers set to BC101
      const staffUsers = [
        ["staff1", "staff123", "Ramdas Saindane", "BC101", "SDC", "user"],
        ["staff2", "staff123", "Sandeep Polkam", "BC101", "SDC", "user"],
        ["staff3", "staff123", "Nitin Khairnar", "BC101", "SDC", "user"],
        ["staff4", "staff123", "Asha Patil", "BC101", "SDC", "user"],
        ["staff5", "staff123", "Bharat Thorat", "BC101", "SDC", "user"],
        ["staff6", "staff123", "Vithal More", "BC101", "SDC", "user"],
        ["staff7", "staff123", "Vaibhav Dhoge", "BC101", "SDC", "user"],
        ["staff8", "staff123", "Asha Katkar", "BC101", "SDC", "user"],
        ["staff9", "staff123", "Priti Ubale", "BC101", "SDC", "user"],
        ["staff10", "staff123", "Archana Waghole","BC101", "SDC",  "user"],
        ["staff11", "staff123", "Govardhan", "BC101", "SDC", "user"],
        ["staff12", "staff123", "Kishor Malokar", "BC101", "SDC", "user"],
        ["staff13", "staff123", "Mrunal", "BC101", "SDC", "user"]
      ];

      for (const [username, password, name, bcNumber, dept, role] of staffUsers) {
        const staffPassword = bcrypt.hashSync(password, 10);
        await db.execute(
          "INSERT INTO users (username, password_hash, name, bc_number, department, role) VALUES (?, ?, ?, ?, ?, ?)",
          [username, staffPassword, name, bcNumber, dept, role]
        );
      }
      console.log(`      ✓ ${staffUsers.length} staff users created (default password: staff123, BC: BC101)`);
    } else {
      console.log('   👥 Users already exist, skipping...');
    }

    // Seed Labs
    const [labRows] = await db.execute("SELECT COUNT(*) as count FROM labs");
    if (labRows[0].count === 0) {
      console.log('   🏢 Creating lab data...');
      
      const labs = [
        // SDC Workshop Labs (10 labs)
        ['FST TCF', 'SDC Workshop', 30, 0, 'Chairs, Whiteboard', 'Ramdas Saindane', 0.00],
        ['FST B1W', 'SDC Workshop', 30, 0, 'Chairs, Whiteboard', 'Sandeep Polkam', 0.00],
        ['B1W', 'SDC Workshop', 40, 0, 'Benches, Projector', 'Nitin Khairnar', 0.00],
        ['Prayas', 'HR Building', 50, 1, 'Chairs, smart Board', 'Priti Ubale', 0.00],
        ['Mechatronics', 'SDC Workshop', 70, 0, 'Benches, Projector', 'Asha Patil', 0.00],
        ['5S Hall', 'SDC Workshop', 70, 0, 'Benches, Projector', 'Bharat Thorat', 0.00],
        ['NTTF side', 'SDC Workshop', 50, 0, 'Chair, Projector', 'Vithal More', 0.00],
        ['ARVR Lab', 'SDC Workshop', 20, 0, 'Chair, smart Board', 'Vaibhav Dhoge', 0.00],
        ['Industry 4.0 Lab', 'SDC Workshop', 20, 0, 'Chair, smart Board', 'Asha Katkar', 0.00],
        ['Innovation Lab', 'SDC Workshop', 35, 1, 'Smart Board, Projector, Chairs', 'Innovation Team', 0.00],

        // HR Building Labs (9 labs)
        ['SDP', 'HR Building', 70, 1, 'Projector, Chairs', 'Archana Waghole', 0.00],
        ['Safari', 'HR Building', 45, 0, 'Benches, smart Board', 'Govardhan', 0.00],
        ['Udan', 'HR Building', 45, 0, 'Benches', 'Vaibhav Dhoge', 0.00],
        ['Unnati', 'HR Building', 48, 0, 'Benches, smart Board', 'Kishor Malokar', 0.00],
        ['Utkarsh', 'HR Building', 48, 0, 'Benches, smart Board', 'Kishor Malokar', 0.00],
        ['Athang', 'HR Building', 70, 0, 'Benches', 'Kishor Malokar', 0.00],
        ['Prima', 'HR Building', 110, 0, 'Benches, Projector', 'Mrunal', 0.00],
        ['Research Lab', 'HR Building', 25, 1, 'Advanced Equipment, Computers', 'Research Team', 0.00],
        ['Conference Hall', 'HR Building', 80, 1, 'Projector, Sound System, Chairs', 'Admin Team', 0.00]
      ];
      
      // Inserting the labs
      for (const lab of labs) {
        await db.execute(
            "INSERT INTO labs (name, building, capacity, is_ac, facilities, lab_owner, hourly_charges) VALUES (?, ?, ?, ?, ?, ?, ?)",
            lab
        );
      }
      console.log(`      ✓ ${labs.length} labs created successfully`);
    } else {
      console.log('   🏢 Labs already exist, skipping...');
    }

    // Create some sample bookings if none exist
    const [bookingRows] = await db.execute("SELECT COUNT(*) as count FROM bookings");
    if (bookingRows[0].count === 0) {
      console.log('   📅 Creating sample bookings...');
      
      // Get user IDs
      const [users] = await db.execute("SELECT id, bc_number FROM users WHERE role = 'user' LIMIT 3");
      const [labs] = await db.execute("SELECT id FROM labs LIMIT 5");
      
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const formatDate = (date) => date.toISOString().split('T')[0];
      
      const sampleBookings = [];
      
      // Create some sample bookings
      if (users.length > 0 && labs.length > 0) {
        for (let i = 0; i < Math.min(5, labs.length); i++) {
          sampleBookings.push([
            labs[i % labs.length].id,
            users[0].id,
            users[0].bc_number,
            '10:00',
            '12:00',
            formatDate(tomorrow),
            2.0,
            'Regular class',
            'confirmed',
            false,
            null
          ]);
        }
        
        for (const booking of sampleBookings) {
          await db.execute(
            `INSERT INTO bookings 
             (lab_id, user_id, bc_number, start_time, end_time, booking_date, duration_hours, purpose, status, is_recurring, recurring_days) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            booking
          );
        }
        console.log(`      ✓ ${sampleBookings.length} sample bookings created`);
      }
    }

    console.log('\n✅ Database initialization completed successfully!');
    console.log('📊 Database:', dbConfig.database);
    console.log('📊 Summary:');
    console.log('   - Users table: ready (BC101 for all users)');
    console.log('   - Labs table: ready');
    console.log('   - Bookings table: ready');
    console.log('   - Notifications table: ready');
    console.log('   - Blocked slots table: ready');
    console.log('   - Audit logs table: ready');
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Admin:  username: admin,  password: admin123');
    console.log('   Staff:  username: staff1, password: staff123');
    console.log('           (and staff2 through staff13 with same password)');

  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    console.error('Error details:', err.message);
    process.exit(1);
  } finally {
    if (db) {
      await db.end();
      console.log('\n📡 Database connection closed');
    }
  }
};

// Run the initialization
if (require.main === module) {
  initDB().then(() => {
    console.log('\n✨ Setup complete! You can now start your server.');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { initDB, connectDB };