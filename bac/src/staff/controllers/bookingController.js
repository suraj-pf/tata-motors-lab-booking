const { pool } = require('../../shared/config/database');
const { emitToLab, emitToUser, emitToAdmins } = require('../../shared/config/socket');
const { calculateDuration } = require('../../shared/utils/timeSlots');
const AuditLog = require('../../shared/models/AuditLog');

const createBooking = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { lab_id, start_time, end_time, booking_date, bc_number, purpose } = req.body;
    const duration = calculateDuration(start_time, end_time);

    // Rule 1: Time constraints validation (06:30 AM - 05:00 PM)
    const [startHour, startMin] = start_time.split(':').map(Number);
    const [endHour, endMin] = end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    const MIN_START_TIME = 6 * 60 + 30; // 06:30 AM = 390 minutes
    const MAX_END_TIME = 17 * 60 + 30; // 05:30 PM = 1050 minutes (allow booking to end at 5:30 PM)
    
    if (startMinutes < MIN_START_TIME) {
      await connection.rollback();
      console.log(`[BOOKING REJECTED] User ${req.user.id} attempted to book before 06:30 AM: ${start_time}`);
      return res.status(400).json({ success: false, message: 'Booking cannot start before 06:30 AM.' });
    }
    
    if (endMinutes > MAX_END_TIME) {
      await connection.rollback();
      console.log(`[BOOKING REJECTED] User ${req.user.id} attempted to book after 17:30 PM: ${end_time}`);
      return res.status(400).json({ success: false, message: 'Booking cannot end after 05:30 PM.' });
    }

    // Rule 2: Duration validation
    if (duration > 10.5) {
      await connection.rollback();
      console.log(`[BOOKING REJECTED] User ${req.user.id} attempted booking duration > 10.5h: ${duration}h`);
      return res.status(400).json({ success: false, message: 'Maximum 10.5 hours allowed' });
    }

    if (duration < 0.5) {
      await connection.rollback();
      console.log(`[BOOKING REJECTED] User ${req.user.id} attempted booking duration < 0.5h: ${duration}h`);
      return res.status(400).json({ success: false, message: 'Minimum 0.5 hours required' });
    }

    // Rule 3: No past booking validation (with current hour flexibility)
    const bookingDateTime = new Date(`${booking_date}T${start_time}`);
    const currentServerTime = new Date();
    
    // Get current date only (without time) for date comparison
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const bookingDateOnly = new Date(booking_date);
    bookingDateOnly.setHours(0, 0, 0, 0);
    
    // Check if booking date is in the past
    if (bookingDateOnly < currentDate) {
      await connection.rollback();
      console.log(`[BOOKING REJECTED] User ${req.user.id} attempted to book past date: ${booking_date}`);
      return res.status(400).json({ success: false, message: 'Cannot book past dates. Please select today or a future date.' });
    }
    
    // If booking is for today, check current hour flexibility
    if (bookingDateOnly.getTime() === currentDate.getTime()) {
      const currentHour = currentServerTime.getHours();
      const currentMin = currentServerTime.getMinutes();
      const currentHourMinutes = currentHour * 60;
      
      // Allow booking if it's the current hour (within first 30 mins) or future
      if (startMinutes < currentHourMinutes) {
        await connection.rollback();
        console.log(`[BOOKING REJECTED] User ${req.user.id} attempted to book past time: ${start_time} (current: ${currentHour}:${currentMin})`);
        return res.status(400).json({ success: false, message: 'Booking must be for current hour or future time.' });
      }
      
      // If it's the current hour, only allow if within first 30 minutes
      if (startMinutes === currentHourMinutes && currentMin >= 30) {
        await connection.rollback();
        console.log(`[BOOKING REJECTED] User ${req.user.id} attempted to book current hour after 30min mark`);
        return res.status(400).json({ success: false, message: 'Cannot book current hour after 30 minutes have passed.' });
      }
    }

    // Rule 3: Check for conflicting bookings with detailed conflict info
    const [conflicts] = await connection.execute(
      `SELECT id, start_time, end_time, user_id, purpose
       FROM bookings 
       WHERE lab_id = ? 
         AND booking_date = ? 
         AND status = 'confirmed'
         AND start_time < ? 
         AND end_time > ?`,
      [lab_id, booking_date, end_time, start_time]
    );

    if (conflicts.length > 0) {
      await connection.rollback();
      const conflict = conflicts[0];
      console.log(`[BOOKING CONFLICT] User ${req.user.id} attempted to book lab ${lab_id} at ${start_time}-${end_time} but conflict exists: booking ${conflict.id}`);
      return res.status(409).json({ 
        success: false,
        conflict: true,
        message: `This lab is already booked from ${conflict.start_time} to ${conflict.end_time}`,
        conflictDetails: {
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          booking_id: conflict.id,
          purpose: conflict.purpose
        },
        suggestedAction: 'Please choose a different time slot'
      });
    }

    // Rule 4: Check lab availability and get lab details
    const [lab] = await connection.execute(
      'SELECT * FROM labs WHERE id = ? AND is_active = 1',
      [lab_id]
    );

    if (lab.length === 0) {
      await connection.rollback();
      console.log(`[BOOKING REJECTED] User ${req.user.id} attempted to book invalid lab: ${lab_id}`);
      return res.status(404).json({ success: false, message: 'Lab not found or unavailable' });
    }

    // Rule 5: Validate BC number if provided
    if (bc_number) {
      const [bcCheck] = await connection.execute(
        'SELECT id FROM users WHERE bc_number = ? AND id = ?',
        [bc_number, req.user.id]
      );
      
      if (bcCheck.length === 0) {
        await connection.rollback();
        console.log(`[BOOKING REJECTED] User ${req.user.id} provided invalid BC number: ${bc_number}`);
        return res.status(400).json({ success: false, message: 'Invalid BC number' });
      }
    }

    // Create the booking
    const [result] = await connection.execute(
      `INSERT INTO bookings (
        lab_id, user_id, bc_number, start_time, end_time, 
        booking_date, duration_hours, purpose, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW())`,
      [lab_id, req.user.id, bc_number || req.user.bc_number, start_time, end_time, booking_date, duration, purpose || 'Auto-booking via Lab Map']
    );

    const bookingId = result.insertId;
    console.log(`[BOOKING CREATED] ID: ${bookingId}, User: ${req.user.id}, Lab: ${lab_id}, Time: ${start_time}-${end_time}, Date: ${booking_date}`);

    await connection.commit();

    // Fetch complete booking details for response
    const [newBooking] = await pool.execute(
      `SELECT 
        b.*, 
        l.name as lab_name, 
        l.building,
        l.capacity,
        l.is_ac,
        l.facilities,
        u.name as user_name,
        u.department,
        u.bc_number
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [bookingId]
    );

    const bookingData = newBooking[0];

    // Log to audit
    await AuditLog.logAction(
      req.user.id, 
      'booking_created', 
      lab_id, 
      bookingId, 
      null, 
      bookingData,
      req.ip,
      req.get('user-agent')
    );

    // Emit real-time updates - Enhanced synchronization loop
    const io = require('../shared/config/socket').getIO();
    
    if (io) {
      // 1. Emit to lab-specific room
      io.to(`lab-${lab_id}`).emit('booking-created', {
        type: 'booking-created',
        lab_id,
        booking: bookingData,
        timestamp: new Date().toISOString()
      });
      
      // 2. Emit to admin room for global updates
      io.to('admin-room').emit('booking-created', {
        type: 'booking-created',
        lab_id,
        booking: bookingData,
        timestamp: new Date().toISOString()
      });
      
      // 3. Emit timeline-specific update
      io.emit('timeline-update', {
        type: 'booking-created',
        lab_id,
        booking: bookingData,
        booking_date: booking_date,
        timestamp: new Date().toISOString()
      });
      
      // 4. Emit room status update
      io.emit('room-status-update', {
        lab_id,
        status: 'occupied',
        timestamp: new Date().toISOString(),
        current_booking: bookingData
      });
      
      // 5. Emit user-specific notification
      io.to(`user-${req.user.id}`).emit('user-notification', {
        type: 'booking-created',
        message: 'Your booking has been confirmed',
        data: bookingData
      });
    }
    
    // Legacy emit functions for backward compatibility
    emitToLab(lab_id, 'booking-created', {
      bookingId,
      lab_id,
      lab_name: bookingData.lab_name,
      date: booking_date,
      time: `${start_time} - ${end_time}`,
      user: req.user.name,
      status: 'confirmed'
    });

    emitToUser(req.user.id, 'booking-created', {
      bookingId,
      lab_name: bookingData.lab_name,
      date: booking_date,
      time: `${start_time} - ${end_time}`,
      message: 'Your booking has been confirmed'
    });

    emitToAdmins('admin-notification', {
      type: 'new_booking',
      message: `New booking created by ${req.user.name}`,
      data: {
        bookingId,
        labName: bookingData.lab_name,
        date: booking_date,
        time: `${start_time} - ${end_time}`,
        user: req.user.name
      }
    });

    res.status(201).json({ 
      success: true, 
      message: 'Booking created successfully',
      booking: bookingData 
    });

  } catch (error) {
    await connection.rollback();
    console.error(`[BOOKING ERROR] User ${req.user?.id}:`, error);
    res.status(500).json({ success: false, message: 'Failed to create booking', error: error.message });
  } finally {
    connection.release();
  }
};


const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date, booking_date } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    let query = `
      SELECT 
        b.id,
        b.lab_id,
        b.user_id,
        b.bc_number,
        b.start_time,
        b.end_time,
        b.booking_date,
        b.duration_hours,
        b.purpose,
        b.status,
        b.created_at,
        b.updated_at,
        l.name as lab_name,
        l.building,
        l.capacity,
        l.is_ac,
        l.facilities,
        u.name as user_name,
        u.department
       FROM bookings b
       INNER JOIN labs l ON b.lab_id = l.id
       INNER JOIN users u ON b.user_id = u.id
    `;
    
    const params = [];
    
    // If user is admin, get all bookings, otherwise get user's bookings
    if (req.user.role === 'admin') {
      // Admin can see all bookings
    } else {
      query += ` WHERE b.user_id = ?`;
      params.push(userId);
    }
    
    // Add date filtering - support both single date and date range
    if (booking_date) {
      // Single date filtering (for timeline)
      query += req.user.role === 'admin' ? ' WHERE' : ' AND';
      query += ` b.booking_date = ?`;
      params.push(booking_date);
    } else if (start_date && end_date) {
      // Date range filtering
      query += req.user.role === 'admin' ? ' WHERE' : ' AND';
      query += ` b.booking_date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }
    
    query += ` ORDER BY b.booking_date ASC, b.start_time ASC, l.building ASC, l.name ASC`;
    
    // For timeline with specific date, don't limit results
    if (!booking_date && !start_date && !end_date) {
      query += ` LIMIT 50`;
    }
    
    const [bookings] = await pool.execute(query, params);

    res.json({
      success: true,
      bookings: bookings,
      pagination: {
        total: bookings.length,
        limit: 50,
        offset: 0,
        hasMore: false
      },
      filters: {
        booking_date,
        start_date,
        end_date
      }
    });

  } catch (error) {
    console.error('[BOOKING FETCH ERROR]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [bookings] = await pool.execute(
      `SELECT 
        b.*, 
        l.name as lab_name, 
        l.building,
        l.capacity,
        l.is_ac,
        l.facilities,
        u.name as user_name,
        u.department,
        u.bc_number
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ? AND (b.user_id = ? OR ? = 'admin')`,
      [bookingId, req.user.id, req.user.role]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ 
      success: true, 
      booking: bookings[0] 
    });

  } catch (error) {
    console.error('[BOOKING FETCH ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking', error: error.message });
  }
};

const cancelBooking = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { bookingId } = req.params;
    const { reason } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Fetch booking with lock for update
    const [booking] = await connection.execute(
      'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
      [bookingId]
    );

    if (booking.length === 0) {
      await connection.rollback();
      console.log(`[CANCEL REJECTED] Booking ${bookingId} not found`);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if user owns the booking or is admin
    if (booking[0].user_id !== req.user.id && req.user.role !== 'admin') {
      await connection.rollback();
      console.log(`[CANCEL REJECTED] User ${req.user.id} not authorized to cancel booking ${bookingId}`);
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    // Validate cancellation rules
    if (booking[0].booking_date < today) {
      await connection.rollback();
      console.log(`[CANCEL REJECTED] Attempted to cancel past booking ${bookingId}`);
      return res.status(400).json({ success: false, message: 'Cannot cancel past bookings' });
    }

    if (booking[0].booking_date === today) {
      const currentTime = new Date().toTimeString().slice(0, 5);
      if (booking[0].start_time <= currentTime) {
        await connection.rollback();
        console.log(`[CANCEL REJECTED] Attempted to cancel already-started booking ${bookingId}`);
        return res.status(400).json({ success: false, message: 'Cannot cancel booking that has already started' });
      }
    }

    if (booking[0].status === 'cancelled') {
      await connection.rollback();
      console.log(`[CANCEL REJECTED] Booking ${bookingId} already cancelled`);
      return res.status(400).json({ success: false, message: 'Booking already cancelled' });
    }

    if (booking[0].status === 'completed') {
      await connection.rollback();
      console.log(`[CANCEL REJECTED] Attempted to cancel completed booking ${bookingId}`);
      return res.status(400).json({ success: false, message: 'Cannot cancel completed booking' });
    }

    // Update booking status
    await connection.execute(
      'UPDATE bookings SET status = "cancelled" WHERE id = ?',
      [bookingId]
    );
    console.log(`[BOOKING CANCELLED] ID: ${bookingId}, User: ${req.user.id}, Reason: ${reason || 'No reason'}`);

    await connection.commit();

    // Fetch updated booking for response
    const [updatedBooking] = await pool.execute(
      `SELECT b.*, l.name as lab_name, l.building 
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       WHERE b.id = ?`,
      [bookingId]
    );

    // Log to audit
    await AuditLog.logAction(
      req.user.id, 
      'booking_cancelled', 
      booking[0].lab_id, 
      bookingId, 
      booking[0], 
      { ...booking[0], status: 'cancelled', cancellation_reason: reason },
      req.ip,
      req.get('user-agent')
    );

    // Emit socket events
    emitToLab(booking[0].lab_id, 'booking-cancelled', { 
      bookingId,
      lab_id: booking[0].lab_id,
      lab_name: updatedBooking[0].lab_name,
      date: booking[0].booking_date,
      time: `${booking[0].start_time} - ${booking[0].end_time}`,
      status: 'cancelled',
      cancelled_by: req.user.name,
      reason: reason
    });
    
    emitToUser(booking[0].user_id, 'booking-cancelled', {
      bookingId,
      lab_name: updatedBooking[0].lab_name,
      date: booking[0].booking_date,
      time: `${booking[0].start_time} - ${booking[0].end_time}`,
      message: 'Your booking has been cancelled',
      reason: reason
    });

    if (booking[0].user_id !== req.user.id) {
      emitToAdmins('admin-notification', {
        type: 'booking-cancelled',
        message: `Booking cancelled by admin ${req.user.name}`,
        data: {
          bookingId,
          labName: updatedBooking[0].lab_name,
          user: booking[0].user_name,
          reason
        }
      });
    }

    res.json({ 
      success: true, 
      message: 'Booking cancelled successfully',
      booking: updatedBooking[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('[CANCEL ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking', error: error.message });
  } finally {
    connection.release();
  }
};

const checkAvailability = async (req, res) => {
  try {
    const { lab_id, date, start_time, end_time } = req.query;

    if (!lab_id || !date) {
      return res.status(400).json({ success: false, message: 'lab_id and date are required' });
    }

    // If specific time range provided, check that slot
    if (start_time && end_time) {
      const [conflicts] = await pool.execute(
        `SELECT id FROM bookings 
         WHERE lab_id = ? 
           AND booking_date = ? 
           AND status = 'confirmed'
           AND start_time < ? 
           AND end_time > ?`,
        [lab_id, date, end_time, start_time]
      );

      return res.json({
        success: true,
        available: conflicts.length === 0,
        lab_id,
        date,
        start_time,
        end_time
      });
    }

    // Otherwise return all booked slots for the day
    const [bookings] = await pool.execute(
      `SELECT start_time, end_time FROM bookings 
       WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'
       ORDER BY start_time`,
      [lab_id, date]
    );

    const { generateTimeSlots, isTimeSlotAvailable } = require('../../shared/utils/timeSlots');
    const allSlots = generateTimeSlots();
    
    const availability = allSlots.map(slot => ({
      ...slot,
      available: isTimeSlotAvailable(bookings, slot.start, slot.end)
    }));

    res.json({
      success: true,
      lab_id,
      date,
      bookedSlots: bookings,
      availability,
      totalSlots: allSlots.length,
      availableSlots: availability.filter(s => s.available).length
    });

  } catch (error) {
    console.error('[AVAILABILITY ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to check availability', error: error.message });
  }
};

const getUpcomingBookings = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);

    const [bookings] = await pool.execute(
      `SELECT 
        b.*, 
        l.name as lab_name, 
        l.building,
        l.capacity,
        l.is_ac,
        u.name as user_name,
        u.department,
        u.bc_number
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       JOIN users u ON b.user_id = u.id
       WHERE b.user_id = ? 
         AND b.status != 'cancelled'
         AND (b.booking_date > ? OR (b.booking_date = ? AND b.end_time > ?))
       ORDER BY b.booking_date ASC, b.start_time ASC`,
      [req.user.id, today, today, currentTime]
    );

    res.json({
      success: true,
      bookings,
      total: bookings.length
    });

  } catch (error) {
    console.error('[UPCOMING BOOKINGS ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch upcoming bookings', error: error.message });
  }
};

const getBookingHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    
    const pageInt = parseInt(page, 10);
    const limitInt = parseInt(limit, 10);
    const offset = (pageInt - 1) * limitInt;

    // First, get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM bookings 
       WHERE user_id = ? AND (status = 'completed' OR status = 'cancelled')`,
      [userId]
    );

    const total = countResult[0].total;

    if (total === 0) {
      return res.json({
        success: true,
        bookings: [],
        pagination: {
          total: 0,
          page: pageInt,
          limit: limitInt,
          pages: 0
        }
      });
    }

    // Get paginated results with parameterized LIMIT/OFFSET
    const [bookings] = await pool.execute(
      `SELECT 
        b.*, 
        l.name as lab_name, 
        l.building
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       WHERE b.user_id = ? 
         AND (b.status = 'completed' OR b.status = 'cancelled')
       ORDER BY b.booking_date DESC, b.start_time DESC
       LIMIT ? OFFSET ?`,
      [userId, limitInt, offset]
    );

    res.json({
      success: true,
      bookings,
      pagination: {
        total,
        page: pageInt,
        limit: limitInt,
        pages: Math.ceil(total / limitInt)
      }
    });

  } catch (error) {
    console.error('[BOOKING HISTORY ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking history', error: error.message });
  }
};

const updateBooking = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { bookingId } = req.params;
    const { start_time, end_time, booking_date, purpose } = req.body;

    // Fetch existing booking
    const [booking] = await connection.execute(
      'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
      [bookingId]
    );

    if (booking.length === 0) {
      await connection.rollback();
      console.log(`[UPDATE REJECTED] Booking ${bookingId} not found`);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check ownership
    if (booking[0].user_id !== req.user.id && req.user.role !== 'admin') {
      await connection.rollback();
      console.log(`[UPDATE REJECTED] User ${req.user.id} not authorized to update booking ${bookingId}`);
      return res.status(403).json({ success: false, message: 'Not authorized to update this booking' });
    }

    // Validate if update is allowed
    const today = new Date().toISOString().split('T')[0];
    if (booking[0].booking_date < today) {
      await connection.rollback();
      console.log(`[UPDATE REJECTED] Attempted to update past booking ${bookingId}`);
      return res.status(400).json({ success: false, message: 'Cannot update past bookings' });
    }

    if (booking[0].status !== 'confirmed') {
      await connection.rollback();
      console.log(`[UPDATE REJECTED] Attempted to update non-confirmed booking ${bookingId}`);
      return res.status(400).json({ success: false, message: 'Can only update confirmed bookings' });
    }

    // Calculate new duration if times changed
    let duration = booking[0].duration_hours;
    if (start_time && end_time) {
      duration = calculateDuration(start_time, end_time);
      
      if (duration > 10.5) {
        await connection.rollback();
        console.log(`[UPDATE REJECTED] Duration > 10.5h for booking ${bookingId}`);
        return res.status(400).json({ success: false, message: 'Maximum 10.5 hours allowed' });
      }

      if (duration < 0.5) {
        await connection.rollback();
        console.log(`[UPDATE REJECTED] Duration < 0.5h for booking ${bookingId}`);
        return res.status(400).json({ success: false, message: 'Minimum 0.5 hours required' });
      }
    }

    // Check for conflicts if date/time changed
    if (start_time || end_time || booking_date) {
      const checkDate = booking_date || booking[0].booking_date;
      const checkStart = start_time || booking[0].start_time;
      const checkEnd = end_time || booking[0].end_time;

      const [conflicts] = await connection.execute(
        `SELECT id FROM bookings 
         WHERE lab_id = ? 
           AND booking_date = ? 
           AND status = 'confirmed' 
           AND id != ?
           AND start_time < ? 
           AND end_time > ?`,
        [
          booking[0].lab_id, 
          checkDate, 
          bookingId,
          checkEnd, 
          checkStart
        ]
      );

      if (conflicts.length > 0) {
        await connection.rollback();
        console.log(`[UPDATE CONFLICT] Booking ${bookingId} conflicts with existing booking`);
        return res.status(400).json({ success: false, message: 'Time slot conflict with existing booking' });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (start_time) {
      updates.push('start_time = ?');
      params.push(start_time);
    }
    if (end_time) {
      updates.push('end_time = ?');
      params.push(end_time);
    }
    if (booking_date) {
      updates.push('booking_date = ?');
      params.push(booking_date);
    }
    if (duration !== booking[0].duration_hours) {
      updates.push('duration_hours = ?');
      params.push(duration);
    }
    if (purpose) {
      updates.push('purpose = ?');
      params.push(purpose);
    }

    if (updates.length === 0) {
      await connection.rollback();
      console.log(`[UPDATE REJECTED] No updates provided for booking ${bookingId}`);
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    params.push(bookingId);

    await connection.execute(
      `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    await connection.commit();

    // Fetch updated booking
    const [updatedBooking] = await pool.execute(
      `SELECT b.*, l.name as lab_name, l.building 
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       WHERE b.id = ?`,
      [bookingId]
    );

    // Log to audit
    await AuditLog.logAction(
      req.user.id, 
      'booking_updated', 
      booking[0].lab_id, 
      bookingId, 
      booking[0], 
      updatedBooking[0],
      req.ip,
      req.get('user-agent')
    );

    // Emit socket events
    emitToLab(booking[0].lab_id, 'booking-updated', updatedBooking[0]);
    emitToUser(booking[0].user_id, 'booking-updated', updatedBooking[0]);

    console.log(`[BOOKING UPDATED] ID: ${bookingId}, User: ${req.user.id}`);

    res.json({ 
      success: true, 
      message: 'Booking updated successfully',
      booking: updatedBooking[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('[UPDATE ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking', error: error.message });
  } finally {
    connection.release();
  }
};

const getTodayBookings = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const [bookings] = await pool.execute(
      `SELECT 
        b.id,
        b.user_id,
        b.lab_id,
        b.start_time,
        b.end_time,
        b.booking_date,
        b.duration_hours,
        b.purpose,
        b.status,
        b.created_at,
        b.updated_at,
        l.name as lab_name,
        l.building,
        l.capacity,
        l.is_ac,
        u.name as user_name,
        u.department,
        u.bc_number
       FROM bookings b
       INNER JOIN labs l ON b.lab_id = l.id
       INNER JOIN users u ON b.user_id = u.id
       WHERE b.booking_date = ?
       ORDER BY b.start_time ASC`,
      [today]
    );

    res.json({
      success: true,
      bookings: bookings,
      date: today,
      total: bookings.length
    });

  } catch (error) {
    console.error('[TODAY BOOKINGS ERROR]:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch today bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const approveBooking = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { bookingId } = req.params;
    const { approved, reason } = req.body;

    // Only admins can approve bookings
    if (req.user.role !== 'admin') {
      await connection.rollback();
      console.log(`[APPROVE REJECTED] User ${req.user.id} not admin`);
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Fetch booking with lock
    const [booking] = await connection.execute(
      'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
      [bookingId]
    );

    if (booking.length === 0) {
      await connection.rollback();
      console.log(`[APPROVE REJECTED] Booking ${bookingId} not found`);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const bookingData = booking[0];

    if (bookingData.status !== 'pending') {
      await connection.rollback();
      console.log(`[APPROVE REJECTED] Booking ${bookingId} not pending`);
      return res.status(400).json({ success: false, message: 'Booking is not pending' });
    }

    let newStatus = approved ? 'confirmed' : 'rejected';

    // If approving, check for conflicts again
    if (approved) {
      const [conflicts] = await connection.execute(
        `SELECT id FROM bookings 
         WHERE lab_id = ? 
           AND booking_date = ? 
           AND status = 'confirmed'
           AND start_time < ? 
           AND end_time > ?
           AND id != ?`,
        [bookingData.lab_id, bookingData.booking_date, bookingData.end_time, bookingData.start_time, bookingId]
      );

      if (conflicts.length > 0) {
        await connection.rollback();
        console.log(`[APPROVE CONFLICT] Booking ${bookingId} has conflicts`);
        return res.status(400).json({ success: false, message: 'Time slot now has conflicts. Cannot approve.' });
      }
    }

    // Update booking status
    await connection.execute(
      'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, bookingId]
    );

    await connection.commit();

    // Fetch updated booking
    const [updatedBooking] = await pool.execute(
      `SELECT b.*, l.name as lab_name, l.building, u.name as user_name
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [bookingId]
    );

    const responseBooking = { ...updatedBooking[0], approval_reason: reason };

    // Log to audit
    await AuditLog.logAction(
      req.user.id, 
      approved ? 'booking_approved' : 'booking_rejected', 
      bookingData.lab_id, 
      bookingId, 
      bookingData, 
      responseBooking,
      req.ip,
      req.get('user-agent')
    );

    // Emit socket events
    if (approved) {
      emitToUser(bookingData.user_id, 'booking-approved', responseBooking);
      emitToLab(bookingData.lab_id, 'booking-approved', responseBooking);
    } else {
      emitToUser(bookingData.user_id, 'booking-rejected', responseBooking);
    }

    console.log(`[BOOKING ${approved ? 'APPROVED' : 'REJECTED'}] ID: ${bookingId}, Admin: ${req.user.id}`);

    res.json({
      success: true,
      message: `Booking ${approved ? 'approved' : 'rejected'} successfully`,
      booking: responseBooking
    });

  } catch (error) {
    await connection.rollback();
    console.error('[APPROVE ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to process approval', error: error.message });
  } finally {
    connection.release();
  }
};

const getPendingBookings = async (req, res) => {
  try {
    // Only admins can view pending bookings
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const [bookings] = await pool.execute(
      `SELECT 
        b.*,
        l.name as lab_name,
        l.building,
        u.name as user_name,
        u.department,
        u.bc_number as user_bc_number,
        (SELECT COUNT(*) FROM bookings b2 
         WHERE b2.lab_id = b.lab_id 
           AND b2.booking_date = b.booking_date 
           AND b2.status = 'pending'
           AND b2.start_time < b.start_time 
           AND b2.end_time > b.start_time
         AND b2.created_at < b.created_at) as queue_position
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       JOIN users u ON b.user_id = u.id
       WHERE b.status = 'pending'
       ORDER BY b.booking_date ASC, b.created_at ASC
       LIMIT 50`
    );

    res.json({
      success: true,
      bookings: bookings,
      total: bookings.length
    });

  } catch (error) {
    console.error('[PENDING BOOKINGS ERROR]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending bookings', error: error.message });
  }
};

module.exports = {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  updateBooking,
  checkAvailability,
  getUpcomingBookings,
  getBookingHistory,
  approveBooking,
  getPendingBookings,
  getTodayBookings
};
