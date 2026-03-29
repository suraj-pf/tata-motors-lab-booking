const { pool } = require('../config/database');
const { emitToLab, emitToUser, emitToAdmins } = require('../config/socket');
const { calculateDuration } = require('../utils/timeSlots');
const AuditLog = require('../models/AuditLog');

const createBooking = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { lab_id, start_time, end_time, booking_date, bc_number, purpose } = req.body;
    const duration = calculateDuration(start_time, end_time);

    // Rule 1: Duration validation
    if (duration > 10.5) {
      await connection.rollback();
      return res.status(400).json({ error: 'Maximum 10.5 hours allowed' });
    }

    if (duration < 0.5) {
      await connection.rollback();
      return res.status(400).json({ error: 'Minimum 0.5 hours required' });
    }

    // Rule 2: No past booking validation
    const bookingDateTime = new Date(`${booking_date}T${start_time}`);
    const currentServerTime = new Date();
    
    if (bookingDateTime < currentServerTime) {
      await connection.rollback();
      return res.status(400).json({ error: 'Booking must be scheduled for current or future time only.' });
    }

    // Check for existing confirmed bookings for this time slot
    const [existingConfirmed] = await connection.execute(
      `SELECT id, user_id, created_at FROM bookings
       WHERE lab_id = ?
         AND booking_date = ?
         AND status = 'confirmed'
         AND start_time < ?
         AND end_time > ?`,
      [lab_id, booking_date, end_time, start_time]
    );

    // Check for pending bookings in queue for this time slot
    const [existingPending] = await connection.execute(
      `SELECT id, user_id, created_at FROM bookings
       WHERE lab_id = ?
         AND booking_date = ?
         AND status = 'pending'
         AND start_time < ?
         AND end_time > ?
         ORDER BY created_at ASC`,
      [lab_id, booking_date, end_time, start_time]
    );

    let bookingStatus = 'pending';
    let queuePosition = existingPending.length + 1;

    // If no confirmed bookings and user is first in queue, auto-confirm
    if (existingConfirmed.length === 0 && existingPending.length === 0) {
      bookingStatus = 'confirmed';
      queuePosition = 0;
    }

    // Create booking with appropriate status
    const [result] = await connection.execute(
      `INSERT INTO bookings
       (lab_id, user_id, bc_number, start_time, end_time, booking_date, duration_hours, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        lab_id,
        req.user.id,
        bc_number || req.user.bc_number,
        start_time,
        end_time,
        booking_date,
        duration,
        purpose || null,
        bookingStatus
      ]
    );

    await connection.commit();

    // Fetch complete booking details
    const [newBooking] = await pool.execute(
      `SELECT
        b.*,
        l.name as lab_name,
        l.building,
        l.capacity,
        l.hourly_charges,
        u.name as user_name,
        u.department,
        u.email
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [result.insertId]
    );

    const bookingData = {
      ...newBooking[0],
      queue_position: queuePosition
    };

    // Log to audit
    await AuditLog.logAction(
      req.user.id, 
      'booking_created', 
      lab_id, 
      result.insertId, 
      null, 
      bookingData,
      req.ip,
      req.get('user-agent')
    );

    // Emit socket events
    if (bookingStatus === 'confirmed') {
      emitToUser(req.user.id, 'booking-confirmed', bookingData);
      emitToLab(lab_id, 'booking-confirmed', bookingData);
      emitToAdmins('booking-confirmed', bookingData);
    } else {
      emitToUser(req.user.id, 'booking-pending', bookingData);
      emitToLab(lab_id, 'booking-pending', bookingData);
      emitToAdmins('booking-pending', bookingData);
    }

    // Return appropriate response
    const response = {
      success: true,
      message: bookingStatus === 'confirmed' 
        ? 'Booking confirmed successfully!' 
        : `Booking added to queue! Position: ${queuePosition}`,
      booking: bookingData
    };

    if (bookingStatus === 'confirmed') {
      res.status(201).json(response);
    } else {
      res.status(202).json(response); // 202 Accepted for queue processing
    }

  } catch (error) {
    await connection.rollback();
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking: ' + error.message });
  } finally {
    connection.release();
  }
};

module.exports = { createBooking };
