const { pool } = require('../../shared/config/database');
const bcrypt = require('bcryptjs');

const getAllUsers = async (req, res) => {
  try {
    const { search, role, active } = req.query;
    
    let query = `
      SELECT id, username, name, bc_number, department, role, is_active, created_at 
      FROM users WHERE 1=1
    `;
    const params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR username LIKE ? OR bc_number LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }
    
    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }
    
    if (active !== undefined) {
      query += ' AND is_active = ?';
      params.push(active === 'true');
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const [users] = await pool.execute(query, params);
    
    res.json({ 
      success: true, 
      users: users,
      total: users.length
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, password, name, bc_number, department, role = 'user' } = req.body;
    
    // Check if user already exists (only check username, BC numbers can duplicate)
    const [existingUser] = await pool.execute(
      'SELECT id, username FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash, name, bc_number, department, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, name, bc_number, department, role]
    );
    
    const [newUser] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({ success: true, user: newUser[0] });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department, role, password } = req.body;
    const requestingUserId = req.user.id;
    
    // Allow self-updates for any field, but prevent changing another admin's role
    if (id != requestingUserId && role !== undefined) {
      const [targetUser] = await pool.execute(
        'SELECT role FROM users WHERE id = ?',
        [id]
      );
      
      if (targetUser.length > 0 && targetUser[0].role === 'admin') {
        return res.status(403).json({ error: 'Cannot modify another admin user\'s role' });
      }
    }
    
    let updateFields = [];
    let params = [];
    
    if (name !== undefined) {
      updateFields.push('name = ?');
      params.push(name);
    }
    
    if (department !== undefined) {
      updateFields.push('department = ?');
      params.push(department);
    }
    
    if (role !== undefined) {
      updateFields.push('role = ?');
      params.push(role);
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password_hash = ?');
      params.push(hashedPassword);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    
    await pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    const [updatedUser] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, user: updatedUser[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;
    
    // Allow admin to deactivate themselves, but not other admins
    if (id != requestingUserId) {
      const [targetUser] = await pool.execute(
        'SELECT role FROM users WHERE id = ?',
        [id]
      );
      
      if (targetUser.length > 0 && targetUser[0].role === 'admin') {
        return res.status(403).json({ error: 'Cannot deactivate another admin user' });
      }
    }
    
    // Get current status
    const [currentUser] = await pool.execute(
      'SELECT is_active FROM users WHERE id = ?',
      [id]
    );
    
    if (currentUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Toggle the status
    await pool.execute(
      'UPDATE users SET is_active = NOT is_active WHERE id = ?',
      [id]
    );
    
    // Get updated user
    const [updatedUser] = await pool.execute(
      'SELECT id, username, name, bc_number, department, role, is_active, created_at FROM users WHERE id = ?',
      [id]
    );
    
    const newStatus = updatedUser[0].is_active;
    const statusText = newStatus ? 'activated' : 'deactivated';
    
    res.json({ 
      success: true, 
      message: `User ${statusText} successfully`,
      user: updatedUser[0],
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getAllLabs = async (req, res) => {
  try {
    const { search, building, has_ac, is_ac } = req.query;
    
    let query = 'SELECT * FROM labs WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (name LIKE ? OR building LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam);
    }
    
    if (building) {
      query += ' AND building = ?';
      params.push(building);
    }

    const acFilter = is_ac !== undefined ? is_ac : has_ac;
    
    if (acFilter !== undefined) {
      query += ' AND is_ac = ?';
      const acValue = acFilter === 'true' || acFilter === true || acFilter === '1';
      params.push(acValue);
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50';
    
    const [labs] = await pool.execute(query, params);
    
    res.json({ 
      success: true, 
      labs: labs,
      total: labs.length
    });
  } catch (error) {
    console.error('Get all labs error:', error);
    res.status(500).json({ error: error.message });
  }
};

const createLab = async (req, res) => {
  try {
    const { name, building, capacity, has_ac, is_ac, facilities, lab_owner, hourly_charges, is_active = true } = req.body;
    const acValue = is_ac !== undefined ? is_ac : has_ac;
    
    const [result] = await pool.execute(
      'INSERT INTO labs (name, building, capacity, is_ac, facilities, lab_owner, hourly_charges, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        building,
        capacity,
        acValue === 'true' || acValue === true || acValue === '1',
        facilities,
        lab_owner,
        hourly_charges,
        is_active
      ]
    );
    
    const [newLab] = await pool.execute(
      'SELECT * FROM labs WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({ success: true, lab: newLab[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateLab = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, building, capacity, has_ac, is_ac, facilities, lab_owner, hourly_charges, is_active } = req.body;
    const acValue = is_ac !== undefined ? is_ac : has_ac;
    
    await pool.execute(
      'UPDATE labs SET name = ?, building = ?, capacity = ?, is_ac = ?, facilities = ?, lab_owner = ?, hourly_charges = ?, is_active = ? WHERE id = ?',
      [
        name,
        building,
        capacity,
        acValue === 'true' || acValue === true || acValue === '1',
        facilities,
        lab_owner,
        hourly_charges,
        is_active,
        id
      ]
    );
    
    const [updatedLab] = await pool.execute(
      'SELECT * FROM labs WHERE id = ?',
      [id]
    );
    
    res.json({ success: true, lab: updatedLab[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteLab = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    
    await connection.beginTransaction();
    
    // Check if lab exists
    const [existingLab] = await connection.execute(
      'SELECT * FROM labs WHERE id = ?',
      [id]
    );
    
    if (existingLab.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Lab not found' });
    }
    
    // Check if there are any active or future bookings for this lab
    const [activeBookings] = await connection.execute(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE lab_id = ? 
       AND booking_date >= CURDATE() 
       AND status IN ('confirmed', 'pending')`,
      [id]
    );
    
    if (activeBookings[0].count > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Cannot delete lab with active or future bookings. Please cancel all bookings first.' 
      });
    }
    
    // Delete all past bookings for this lab (for cleanup)
    await connection.execute(
      'DELETE FROM bookings WHERE lab_id = ?',
      [id]
    );
    
    // Delete the lab
    await connection.execute(
      'DELETE FROM labs WHERE id = ?',
      [id]
    );
    
    await connection.commit();
    
    res.json({ success: true, message: 'Lab deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete lab error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

const toggleLabStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get current status before updating
    const [currentLab] = await pool.execute(
      'SELECT is_active FROM labs WHERE id = ?',
      [id]
    );
    
    if (currentLab.length === 0) {
      return res.status(404).json({ error: 'Lab not found' });
    }
    
    // Toggle the status
    await pool.execute(
      'UPDATE labs SET is_active = NOT is_active WHERE id = ?',
      [id]
    );
    
    // Get updated lab
    const [updatedLab] = await pool.execute(
      'SELECT * FROM labs WHERE id = ?',
      [id]
    );
    
    const newStatus = updatedLab[0].is_active;
    const statusText = newStatus ? 'activated' : 'deactivated';
    
    // Emit WebSocket event for real-time updates
    const { emitToLab, emitToAdmins } = require('../../shared/config/socket');
    emitToLab(id, 'lab-status-updated', {
      labId: id,
      is_active: newStatus,
      message: `Lab ${statusText}`
    });
    emitToAdmins('lab-status-updated', {
      labId: id,
      is_active: newStatus,
      message: `Lab ${statusText}`
    });
    
    res.json({ 
      success: true, 
      message: `Lab ${statusText} successfully`,
      lab: updatedLab[0],
      is_active: newStatus
    });
  } catch (error) {
    console.error('Toggle lab status error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const [totalUsers] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [totalLabs] = await pool.execute('SELECT COUNT(*) as count FROM labs WHERE is_active = 1');
    const [todayBookings] = await pool.execute(
      'SELECT COUNT(*) as count FROM bookings WHERE booking_date = CURDATE() AND status = "confirmed"'
    );
    
    // Calculate utilization percentage
    const [utilization] = await pool.execute(`
      SELECT 
        ROUND(
          (SUM(CASE WHEN status = 'confirmed' THEN duration_hours ELSE 0 END) / 
          (COUNT(DISTINCT lab_id) * 10.5)) * 100, 
          1
        ) as utilization_percentage
      FROM bookings 
      WHERE booking_date >= CURDATE() - INTERVAL 7 DAY
      AND booking_date <= CURDATE()
    `);
    
    res.json({
      success: true,
      totalUsers: totalUsers[0].count,
      totalLabs: totalLabs[0].count,
      bookingsToday: todayBookings[0].count,
      utilizationPercentage: utilization[0].utilization_percentage || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRecentBookings = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const [bookings] = await pool.execute(`
      SELECT 
        b.id,
        b.lab_id,
        b.user_id,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.duration_hours,
        b.status,
        b.purpose,
        u.name as user_name,
        u.bc_number,
        l.name as lab_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN labs l ON b.lab_id = l.id
      ORDER BY b.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBookingsPerDay = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const [bookings] = await pool.execute(`
      SELECT 
        DAYNAME(booking_date) as day,
        COUNT(*) as bookings,
        COUNT(DISTINCT lab_id) * 10.5 as capacity
      FROM bookings 
      WHERE booking_date >= CURDATE() - INTERVAL ? DAY
      AND booking_date <= CURDATE()
      AND status = 'confirmed'
      GROUP BY DAYNAME(booking_date), booking_date
      ORDER BY booking_date
    `, [parseInt(days)]);
    
    // Format data for frontend
    const formattedData = bookings.map(booking => ({
      day: booking.day.substring(0, 3).toUpperCase(),
      bookings: booking.bookings,
      capacity: booking.capacity
    }));
    
    res.json({ success: true, data: formattedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const { start_date, end_date, bc_number, status } = req.query;
    let query = `
      SELECT b.*, u.name as user_name, u.bc_number, l.name as lab_name, l.building 
      FROM bookings b 
      JOIN users u ON b.user_id = u.id 
      JOIN labs l ON b.lab_id = l.id 
      WHERE 1=1
    `;
    const params = [];

    if (start_date && end_date) {
      query += ' AND b.booking_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }
    if (bc_number) {
      query += ' AND u.bc_number = ?';
      params.push(bc_number);
    }
    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    query += ' ORDER BY b.created_at DESC';

    const [bookings] = await pool.execute(query, params);
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Calculate the number of days in the date range
    const startDate = new Date(start_date || '2000-01-01');
    const endDate = new Date(end_date || '2099-12-31');
    const daysInRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const totalAvailableHoursPerLab = 8 * daysInRange; // 8 hours per day

    // Enhanced analytics with confirmed and completed bookings
    const [utilization] = await pool.execute(`
      SELECT 
        l.id,
        l.name,
        l.building,
        COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'completed') THEN b.id END) as total_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as confirmed_bookings,
        COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.duration_hours END), 0) as total_hours,
        COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'completed') THEN b.user_id END) as unique_users,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN l.hourly_charges * b.duration_hours END), 0) as revenue,
        ROUND(
          (COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.duration_hours END), 0) / ?) * 100, 
          2
        ) as utilization_percentage
      FROM labs l
      LEFT JOIN bookings b ON l.id = b.lab_id 
        AND b.booking_date BETWEEN ? AND ?
        AND b.status IN ('confirmed', 'completed')
      GROUP BY l.id
      ORDER BY total_bookings DESC
    `, [totalAvailableHoursPerLab, start_date || '2000-01-01', end_date || '2099-12-31']);

    // Get total number of labs for overall utilization calculation
    const [totalLabs] = await pool.execute('SELECT COUNT(*) as count FROM labs');
    const labCount = totalLabs[0].count;
    const totalSystemHours = labCount * totalAvailableHoursPerLab;

    // Enhanced summary with more metrics
    const [summary] = await pool.execute(`
      SELECT 
        COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'completed') THEN b.user_id END) as active_users,
        COUNT(CASE WHEN b.status IN ('confirmed', 'completed') THEN 1 END) as total_bookings,
        COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.duration_hours END), 0) as total_hours_booked,
        COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'completed') THEN b.lab_id END) as labs_used,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN l.hourly_charges * b.duration_hours END), 0) as total_revenue,
        ROUND(
          (COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.duration_hours END), 0) / ?) * 100, 
          2
        ) as overall_utilization
      FROM bookings b
      JOIN labs l ON b.lab_id = l.id
      WHERE b.booking_date BETWEEN ? AND ?
        AND b.status IN ('confirmed', 'completed')
    `, [totalSystemHours, start_date || '2000-01-01', end_date || '2099-12-31']);

    // Get time-wise trends for the selected period
    const [dailyTrends] = await pool.execute(`
      SELECT 
        CASE 
          WHEN EXTRACT(HOUR FROM b.start_time) BETWEEN 6 AND 11 THEN 'Morning (6AM-12PM)'
          WHEN EXTRACT(HOUR FROM b.start_time) BETWEEN 12 AND 17 THEN 'Afternoon (12PM-6PM)'
          WHEN EXTRACT(HOUR FROM b.start_time) BETWEEN 18 AND 22 THEN 'Evening (6PM-10PM)'
          ELSE 'Night (10PM-6AM)'
        END as time_slot,
        COUNT(CASE WHEN b.status IN ('confirmed', 'completed') THEN 1 END) as bookings,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.duration_hours END), 0) as hours,
        COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'completed') THEN b.user_id END) as unique_users
      FROM bookings b
      WHERE b.booking_date BETWEEN ? AND ?
        AND b.status IN ('confirmed', 'completed')
      GROUP BY time_slot
      ORDER BY 
        CASE 
          WHEN time_slot = 'Morning (6AM-12PM)' THEN 1
          WHEN time_slot = 'Afternoon (12PM-6PM)' THEN 2
          WHEN time_slot = 'Evening (6PM-10PM)' THEN 3
          ELSE 4
        END
    `, [start_date || '2000-01-01', end_date || '2099-12-31']);

    // Get monthly comparison for growth calculation
    const [monthlyData] = await pool.execute(`
      SELECT 
        DATE_FORMAT(b.booking_date, '%Y-%m') as month,
        COUNT(CASE WHEN b.status IN ('confirmed', 'completed') THEN 1 END) as bookings,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.duration_hours END), 0) as hours
      FROM bookings b
      WHERE b.booking_date BETWEEN DATE_SUB(?, INTERVAL 2 MONTH) AND ?
        AND b.status IN ('confirmed', 'completed')
      GROUP BY DATE_FORMAT(b.booking_date, '%Y-%m')
      ORDER BY month ASC
    `, [start_date || '2000-01-01', end_date || '2099-12-31']);

    // Get lab ranking with growth
    const [labRanking] = await pool.execute(`
      SELECT 
        l.id,
        l.name,
        l.building,
        COUNT(CASE WHEN b.status IN ('confirmed', 'completed') AND DATE_FORMAT(b.booking_date, '%Y-%m') = DATE_FORMAT(?, '%Y-%m') THEN 1 END) as current_month_bookings,
        COUNT(CASE WHEN b.status IN ('confirmed', 'completed') AND DATE_FORMAT(b.booking_date, '%Y-%m') = DATE_FORMAT(DATE_SUB(?, INTERVAL 1 MONTH), '%Y-%m') THEN 1 END) as previous_month_bookings,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') AND DATE_FORMAT(b.booking_date, '%Y-%m') = DATE_FORMAT(?, '%Y-%m') THEN b.duration_hours END), 0) as current_month_hours,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') AND DATE_FORMAT(b.booking_date, '%Y-%m') = DATE_FORMAT(DATE_SUB(?, INTERVAL 1 MONTH), '%Y-%m') THEN b.duration_hours END), 0) as previous_month_hours
      FROM labs l
      LEFT JOIN bookings b ON l.id = b.lab_id 
        AND b.booking_date >= DATE_SUB(?, INTERVAL 2 MONTH)
        AND b.booking_date <= ?
        AND b.status IN ('confirmed', 'completed')
      GROUP BY l.id
      HAVING current_month_hours > 0 OR previous_month_hours > 0
      ORDER BY current_month_hours DESC
    `, [end_date, end_date, end_date, end_date, start_date || '2000-01-01', end_date || '2099-12-31']);

    // Calculate growth percentages
    const rankingWithGrowth = labRanking.map(lab => ({
      ...lab,
      utilization_percentage: totalAvailableHoursPerLab > 0 ? ((lab.current_month_hours / totalAvailableHoursPerLab) * 100).toFixed(2) : 0,
      growth_percentage: lab.previous_month_hours > 0 ? 
        (((lab.current_month_hours - lab.previous_month_hours) / lab.previous_month_hours) * 100).toFixed(1) : 
        (lab.current_month_hours > 0 ? '100.0' : '0.0')
    }));

    // Get peak hour analysis
    const [peakHours] = await pool.execute(`
      SELECT 
        EXTRACT(HOUR FROM b.start_time) as hour,
        COUNT(CASE WHEN b.status IN ('confirmed', 'completed') THEN 1 END) as bookings,
        COUNT(DISTINCT b.lab_id) as labs_used,
        COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'completed') THEN b.user_id END) as active_users
      FROM bookings b
      WHERE b.booking_date BETWEEN ? AND ?
        AND b.status IN ('confirmed', 'completed')
      GROUP BY EXTRACT(HOUR FROM b.start_time)
      ORDER BY bookings DESC
    `, [start_date || '2000-01-01', end_date || '2099-12-31']);

    res.json({
      success: true,
      utilization,
      summary: summary[0] || {},
      dailyTrends,
      monthlyData,
      labRanking: rankingWithGrowth.slice(0, 5), // Top 5 labs
      peakHours,
      metadata: {
        totalLabs: labCount,
        daysInRange,
        totalAvailableHoursPerLab,
        totalSystemHours
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Update booking status
    await pool.execute(
      'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    
    // Get updated booking
    const [updatedBooking] = await pool.execute(
      `SELECT b.*, u.name as user_name, l.name as lab_name 
       FROM bookings b 
       JOIN users u ON b.user_id = u.id 
       JOIN labs l ON b.lab_id = l.id 
       WHERE b.id = ?`,
      [id]
    );
    
    if (updatedBooking.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    res.json({
      success: true,
      booking: updatedBooking[0],
      message: `Booking status updated to ${status}`
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const autoCompleteExpiredBookings = async (req, res) => {
  try {
    const currentDateTime = new Date();
    const currentDate = currentDateTime.toISOString().split('T')[0];
    const currentTime = currentDateTime.toTimeString().slice(0, 5);
    
    // Find all confirmed bookings that have ended
    const [expiredBookings] = await pool.execute(
      `SELECT id, booking_date, end_time 
       FROM bookings 
       WHERE status = 'confirmed' 
       AND (booking_date < ? OR (booking_date = ? AND end_time <= ?))`,
      [currentDate, currentDate, currentTime]
    );
    
    if (expiredBookings.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No expired bookings found',
        completedCount: 0 
      });
    }
    
    // Update all expired bookings to completed status
    const bookingIds = expiredBookings.map(booking => booking.id);
    
    const [result] = await pool.execute(
      `UPDATE bookings 
       SET status = 'completed', updated_at = NOW() 
       WHERE id IN (${bookingIds.map(() => '?').join(',')})`,
      bookingIds
    );
    
    console.log(`Auto-completed ${result.affectedRows} expired bookings`);
    
    res.json({ 
      success: true, 
      message: `Auto-completed ${result.affectedRows} expired bookings`,
      completedCount: result.affectedRows,
      completedBookings: expiredBookings
    });
  } catch (error) {
    console.error('Auto-complete expired bookings error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getPendingBookings = async (req, res) => {
  try {
    const [bookings] = await pool.execute(`
      SELECT 
        b.id,
        b.lab_id,
        b.user_id,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.duration_hours,
        b.status,
        b.purpose,
        b.created_at,
        u.name as user_name,
        u.bc_number as user_bc_number,
        u.department as user_department,
        l.name as lab_name,
        l.building,
        ROW_NUMBER() OVER (ORDER BY b.created_at ASC) as queue_position
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN labs l ON b.lab_id = l.id
      WHERE b.status = 'pending'
      ORDER BY b.created_at ASC
    `);
    
    res.json({ 
      success: true, 
      bookings: bookings,
      total: bookings.length
    });
  } catch (error) {
    console.error('Get pending bookings error:', error);
    res.status(500).json({ error: error.message });
  }
};

const approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, reason } = req.body;
    
    // Check if booking exists and is pending
    const [existingBooking] = await pool.execute(
      'SELECT * FROM bookings WHERE id = ? AND status = ?',
      [id, 'pending']
    );
    
    if (existingBooking.length === 0) {
      return res.status(404).json({ error: 'Pending booking not found' });
    }
    
    // Update booking status
    const newStatus = approved ? 'confirmed' : 'rejected';
    await pool.execute(
      'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, id]
    );
    
    // Get updated booking details
    const [updatedBooking] = await pool.execute(`
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        l.name as lab_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN labs l ON b.lab_id = l.id
      WHERE b.id = ?
    `, [id]);
    
    const actionText = approved ? 'approved' : 'rejected';
    res.json({ 
      success: true, 
      message: `Booking ${actionText} successfully`,
      booking: updatedBooking[0]
    });
  } catch (error) {
    console.error('Approve booking error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  getAllUsers, 
  getAllBookings, 
  getAnalytics,
  createUser,
  updateUser,
  toggleUserStatus,
  getAllLabs,
  createLab,
  updateLab,
  deleteLab,
  toggleLabStatus,
  getDashboardStats,
  getRecentBookings,
  getBookingsPerDay,
  updateBookingStatus,
  autoCompleteExpiredBookings,
  getPendingBookings,
  approveBooking
};