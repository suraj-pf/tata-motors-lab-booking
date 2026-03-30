const { pool } = require('../config/database');

const Booking = {
  create: async (bookingData, userId) => {
    const [result] = await pool.execute(
      `INSERT INTO bookings (
        lab_id, user_id, bc_number, start_time, end_time, 
        booking_date, duration_hours, purpose, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        bookingData.lab_id, 
        userId, 
        bookingData.bc_number, 
        bookingData.start_time, 
        bookingData.end_time, 
        bookingData.booking_date, 
        bookingData.duration,
        bookingData.purpose || null
      ]
    );
    return result.insertId;
  },
  
  findById: async (id) => {
    const [bookings] = await pool.execute(
      `SELECT b.*, l.name as lab_name, l.building, u.name as user_name 
       FROM bookings b 
       JOIN labs l ON b.lab_id = l.id 
       JOIN users u ON b.user_id = u.id 
       WHERE b.id = ?`,
      [id]
    );
    return bookings[0];
  },
  
  findByUserId: async (userId, filters = {}) => {
    let query = `
      SELECT b.*, l.name as lab_name, l.building 
      FROM bookings b 
      JOIN labs l ON b.lab_id = l.id 
      WHERE b.user_id = ?
    `;
    const params = [userId];

    if (filters.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }
    if (filters.start_date) {
      query += ' AND b.booking_date >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND b.booking_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY b.booking_date DESC, b.start_time ASC';
    
    const [bookings] = await pool.execute(query, params);
    return bookings;
  },
  
  // FIXED: Simplified conflict check query
  checkConflict: async (labId, date, startTime, endTime, excludeBookingId = null) => {
    let query = `
      SELECT id FROM bookings 
      WHERE lab_id = ? 
        AND booking_date = ? 
        AND status = 'confirmed'
        AND start_time < ? 
        AND end_time > ?
    `;
    const params = [labId, date, endTime, startTime];

    if (excludeBookingId) {
      query += ' AND id != ?';
      params.push(excludeBookingId);
    }

    const [conflicts] = await pool.execute(query, params);
    return conflicts.length > 0;
  },

  updateStatus: async (bookingId, status) => {
    const [result] = await pool.execute(
      'UPDATE bookings SET status = ? WHERE id = ?',
      [status, bookingId]
    );
    return result.affectedRows > 0;
  },

  getUpcomingForUser: async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);

    const [bookings] = await pool.execute(
      `SELECT b.*, l.name as lab_name, l.building 
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       WHERE b.user_id = ? 
         AND b.status = 'confirmed'
         AND (b.booking_date > ? OR (b.booking_date = ? AND b.end_time > ?))
       ORDER BY b.booking_date ASC, b.start_time ASC
       LIMIT 10`,
      [userId, today, today, currentTime]
    );
    return bookings;
  }
};

module.exports = Booking;