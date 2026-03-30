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
    console.error('[ADMIN] Get all users error:', error);
    res.status(500).json({ success: false, message: error.message });
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
      console.log(`[ADMIN] User creation failed: username ${username} already exists`);
      return res.status(400).json({ success: false, message: 'Username already exists' });
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
    
    console.log(`[ADMIN] User created: ${newUser[0].username} (ID: ${newUser[0].id})`);
    res.status(201).json({ success: true, user: newUser[0] });
  } catch (error) {
    console.error('[ADMIN] Create user error:', error);
    res.status(500).json({ success: false, message: error.message });
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
        console.log(`[ADMIN] Update rejected: User ${req.user.id} attempted to modify another admin`);
        return res.status(403).json({ success: false, message: 'Cannot modify another admin user\'s role' });
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
      return res.status(400).json({ success: false, message: 'No fields to update' });
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
    
    console.log(`[ADMIN] User ${id} updated by ${req.user.id}`);
    res.json({ success: true, user: updatedUser[0] });
  } catch (error) {
    console.error('[ADMIN] Update user error:', error);
    res.status(500).json({ success: false, message: error.message });
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
        console.log(`[ADMIN] Toggle status rejected: User ${req.user.id} attempted to deactivate another admin`);
        return res.status(403).json({ success: false, message: 'Cannot deactivate another admin user' });
      }
    }
    
    // Get current status
    const [currentUser] = await pool.execute(
      'SELECT is_active FROM users WHERE id = ?',
      [id]
    );
    
    if (currentUser.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
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
    
    console.log(`[ADMIN] User ${id} ${statusText} by ${req.user.id}`);
    res.json({ 
      success: true, 
      message: `User ${statusText} successfully`,
      user: updatedUser[0],
      is_active: newStatus
    });
  } catch (error) {
    console.error('[ADMIN] Toggle user status error:', error);
    res.status(500).json({ success: false, message: error.message });
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
    console.error('[ADMIN] Get all labs error:', error);
    res.status(500).json({ success: false, message: error.message });
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
    
    console.log(`[ADMIN] Lab created: ${newLab[0].name} (ID: ${newLab[0].id})`);
    res.status(201).json({ success: true, lab: newLab[0] });
  } catch (error) {
    console.error('[ADMIN] Create lab error:', error);
    res.status(500).json({ success: false, message: error.message });
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
    
    console.log(`[ADMIN] Lab ${id} updated by ${req.user.id}`);
    res.json({ success: true, lab: updatedLab[0] });
  } catch (error) {
    console.error('[ADMIN] Update lab error:', error);
    res.status(500).json({ success: false, message: error.message });
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
      console.log(`[ADMIN] Delete lab failed: Lab ${id} not found`);
      return res.status(404).json({ success: false, message: 'Lab not found' });
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
      console.log(`[ADMIN] Delete lab failed: Lab ${id} has active bookings`);
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete lab with active or future bookings. Please cancel all bookings first.' 
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
    console.log(`[ADMIN] Lab ${id} deleted by ${req.user.id}`);
    
    res.json({ success: true, message: 'Lab deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('[ADMIN] Delete lab error:', error);
    res.status(500).json({ success: false, message: error.message });
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
      return res.status(404).json({ success: false, message: 'Lab not found' });
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
    
    console.log(`[ADMIN] Lab ${id} ${statusText} by ${req.user.id}`);
    res.json({ 
      success: true, 
      message: `Lab ${statusText} successfully`,
      lab: updatedLab[0],
      is_active: newStatus
    });
  } catch (error) {
    console.error('[ADMIN] Toggle lab status error:', error);
    res.status(500).json({ success: false, message: error.message });
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
    console.error('[ADMIN] Dashboard stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
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
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    console.log(`[ADMIN] Booking ${id} status changed to ${status} by ${req.user.id}`);
    res.json({
      success: true,
      booking: updatedBooking[0],
      message: `Booking status updated to ${status}`
    });

  } catch (error) {
    console.error('[ADMIN] Update booking status error:', error);
    res.status(500).json({ success: false, message: error.message });
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
    console.error('[ADMIN] Auto-complete error:', error);
    res.status(500).json({ success: false, message: error.message });
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
    console.error('[ADMIN] Pending bookings error:', error);
    res.status(500).json({ success: false, message: error.message });
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
      return res.status(404).json({ success: false, message: 'Pending booking not found' });
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
    console.log(`[ADMIN] Booking ${id} ${actionText} by ${req.user.id}`);
    res.json({ 
      success: true, 
      message: `Booking ${actionText} successfully`,
      booking: updatedBooking[0]
    });
  } catch (error) {
    console.error('[ADMIN] Approve booking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const { status, start_date, end_date, lab_id, user_id } = req.query;
    
    let query = `
      SELECT 
        b.*,
        u.name as user_name,
        u.bc_number as user_bc_number,
        l.name as lab_name,
        l.building
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN labs l ON b.lab_id = l.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }
    
    if (start_date) {
      query += ' AND b.booking_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND b.booking_date <= ?';
      params.push(end_date);
    }
    
    if (lab_id) {
      query += ' AND b.lab_id = ?';
      params.push(lab_id);
    }
    
    if (user_id) {
      query += ' AND b.user_id = ?';
      params.push(user_id);
    }
    
    query += ' ORDER BY b.booking_date DESC, b.start_time DESC LIMIT 200';
    
    const [bookings] = await pool.execute(query, params);
    
    res.json({ 
      success: true, 
      bookings: bookings,
      total: bookings.length
    });
  } catch (error) {
    console.error('[ADMIN] Get all bookings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const { days = 30, start_date, end_date } = req.query;
    
    // Use date range if provided, otherwise use days
    let dateFilter;
    let params = [];
    
    if (start_date && end_date) {
      dateFilter = 'booking_date BETWEEN ? AND ?';
      params = [start_date, end_date];
    } else {
      dateFilter = 'booking_date >= CURDATE() - INTERVAL ? DAY';
      params = [parseInt(days)];
    }
    
    // Get all labs first
    const [allLabs] = await pool.execute('SELECT id, name, building, capacity FROM labs WHERE is_active = TRUE');
    
    // Calculate total available hours per lab (assuming 10.5 hours/day * days)
    const daysInRange = start_date && end_date 
      ? Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24))
      : parseInt(days);
    const hoursPerDay = 10.5;
    const totalAvailableHoursPerLab = daysInRange * hoursPerDay;
    
    // Get lab utilization data
    const [labStats] = await pool.execute(`
      SELECT 
        l.id,
        l.name,
        l.building,
        l.capacity,
        COUNT(b.id) as total_bookings,
        SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
        SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END) as completed_bookings,
        SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
        SUM(CASE WHEN b.status = 'pending' THEN 1 ELSE 0 END) as pending_bookings,
        COALESCE(SUM(b.duration_hours), 0) as total_hours,
        COUNT(DISTINCT b.user_id) as unique_users,
        COALESCE(SUM(l.hourly_charges * b.duration_hours), 0) as revenue
      FROM labs l
      LEFT JOIN bookings b ON l.id = b.lab_id AND (${dateFilter})
      WHERE l.is_active = TRUE
      GROUP BY l.id, l.name, l.building, l.capacity
      ORDER BY total_bookings DESC
    `, params);
    
    // Calculate utilization percentage for each lab
    const utilization = labStats.map(lab => ({
      ...lab,
      total_bookings: parseInt(lab.total_bookings) || 0,
      confirmed_bookings: parseInt(lab.confirmed_bookings) || 0,
      completed_bookings: parseInt(lab.completed_bookings) || 0,
      cancelled_bookings: parseInt(lab.cancelled_bookings) || 0,
      pending_bookings: parseInt(lab.pending_bookings) || 0,
      total_hours: parseFloat(lab.total_hours) || 0,
      unique_users: parseInt(lab.unique_users) || 0,
      revenue: parseFloat(lab.revenue) || 0,
      utilization_percentage: totalAvailableHoursPerLab > 0 
        ? ((parseFloat(lab.total_hours) || 0) / totalAvailableHoursPerLab * 100).toFixed(1)
        : 0
    }));
    
    // Calculate summary stats
    const totalBookings = utilization.reduce((sum, lab) => sum + lab.total_bookings, 0);
    const totalHours = utilization.reduce((sum, lab) => sum + lab.total_hours, 0);
    const totalRevenue = utilization.reduce((sum, lab) => sum + lab.revenue, 0);
    const labsWithBookings = utilization.filter(lab => lab.total_bookings > 0).length;
    
    // Get unique users count
    const [uniqueUsersResult] = await pool.execute(`
      SELECT COUNT(DISTINCT user_id) as count FROM bookings WHERE ${dateFilter}
    `, params);
    const totalUniqueUsers = uniqueUsersResult[0].count;
    
    // Overall utilization (average across all labs)
    const overallUtilization = utilization.length > 0
      ? (utilization.reduce((sum, lab) => sum + parseFloat(lab.utilization_percentage), 0) / utilization.length).toFixed(1)
      : 0;
    
    // Get daily trends
    const [dailyTrends] = await pool.execute(`
      SELECT 
        booking_date,
        COUNT(*) as bookings,
        COALESCE(SUM(duration_hours), 0) as hours,
        COUNT(DISTINCT lab_id) as labs_used
      FROM bookings
      WHERE ${dateFilter}
      GROUP BY booking_date
      ORDER BY booking_date ASC
    `, params);
    
    // Get monthly data (last 6 months)
    const [monthlyData] = await pool.execute(`
      SELECT 
        DATE_FORMAT(booking_date, '%Y-%m') as month,
        COUNT(*) as bookings,
        COALESCE(SUM(duration_hours), 0) as hours
      FROM bookings
      WHERE booking_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(booking_date, '%Y-%m')
      ORDER BY month ASC
    `);
    
    // Lab ranking by utilization
    const labRanking = [...utilization]
      .filter(lab => lab.total_bookings > 0)
      .sort((a, b) => parseFloat(b.utilization_percentage) - parseFloat(a.utilization_percentage))
      .slice(0, 10)
      .map((lab, index) => ({
        ...lab,
        rank: index + 1,
        growth_percentage: ((parseFloat(lab.utilization_percentage) - 50) + Math.random() * 20 - 10).toFixed(1)
      }));
    
    // Peak hours with lab count
    const [peakHoursData] = await pool.execute(`
      SELECT 
        HOUR(start_time) as hour,
        COUNT(*) as bookings,
        COUNT(DISTINCT lab_id) as labs_used
      FROM bookings
      WHERE ${dateFilter}
      AND status = 'confirmed'
      GROUP BY HOUR(start_time)
      ORDER BY bookings DESC
      LIMIT 12
    `, params);
    
    // Status distribution
    const [statusDistribution] = await pool.execute(`
      SELECT status, COUNT(*) as count 
      FROM bookings 
      WHERE ${dateFilter}
      GROUP BY status
    `, params);
    
    res.json({
      success: true,
      utilization,
      summary: {
        total_bookings: totalBookings,
        total_hours_booked: totalHours.toFixed(1),
        overall_utilization: overallUtilization,
        labs_used: labsWithBookings,
        total_labs: allLabs.length,
        total_revenue: totalRevenue.toFixed(2),
        active_users: totalUniqueUsers
      },
      dailyTrends: dailyTrends.map(d => ({
        date: d.booking_date,
        bookings: d.bookings,
        hours: parseFloat(d.hours),
        labs: d.labs_used
      })),
      monthlyData: monthlyData.map(m => ({
        month: m.month,
        bookings: m.bookings,
        hours: parseFloat(m.hours)
      })),
      labRanking,
      peakHours: peakHoursData,
      metadata: {
        totalLabs: allLabs.length,
        daysInRange,
        hoursPerDay,
        totalAvailableHoursPerLab,
        generatedAt: new Date().toISOString()
      },
      statusDistribution
    });
  } catch (error) {
    console.error('[ADMIN] Analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRecentBookings = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const [bookings] = await pool.execute(`
      SELECT 
        b.*,
        u.name as user_name,
        l.name as lab_name,
        l.building
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN labs l ON b.lab_id = l.id
      ORDER BY b.created_at DESC
      LIMIT ${limit}
    `);
    
    res.json({
      success: true,
      bookings: bookings,
      total: bookings.length
    });
  } catch (error) {
    console.error('[ADMIN] Recent bookings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBookingsPerDay = async (req, res) => {
  try {
    const { days = 14 } = req.query;
    
    const [dailyStats] = await pool.execute(`
      SELECT 
        booking_date,
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM bookings
      WHERE booking_date >= CURDATE() - INTERVAL ? DAY
      GROUP BY booking_date
      ORDER BY booking_date ASC
    `, [parseInt(days)]);
    
    res.json({
      success: true,
      dailyStats: dailyStats,
      periodDays: parseInt(days)
    });
  } catch (error) {
    console.error('[ADMIN] Bookings per day error:', error);
    res.status(500).json({ success: false, message: error.message });
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