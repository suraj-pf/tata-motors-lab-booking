// const { pool } = require('../config/database');
// const { emitToLab, emitToUser, emitToAdmins } = require('../config/socket');
// const { calculateDuration } = require('../utils/timeSlots');
// const AuditLog = require('../models/AuditLog');

// const createBooking = async (req, res) => {
//   const connection = await pool.getConnection();
//   try {
//     await connection.beginTransaction();

//     const { lab_id, start_time, end_time, booking_date, bc_number, purpose } = req.body;
//     const duration = calculateDuration(start_time, end_time);

//     // Rule 1: Duration validation
//     if (duration > 10.5) {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Maximum 10.5 hours allowed' });
//     }

//     if (duration < 0.5) {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Minimum 0.5 hours required' });
//     }

//     // Rule 2: No past booking validation (enhanced)
//     const bookingDateTime = new Date(`${booking_date}T${start_time}`);
//     const currentServerTime = new Date();
    
//     // Get current date only (without time) for date comparison
//     const currentDate = new Date();
//     currentDate.setHours(0, 0, 0, 0);
//     const bookingDateOnly = new Date(booking_date);
//     bookingDateOnly.setHours(0, 0, 0, 0);
    
//     // Check if booking date is in the past
//     if (bookingDateOnly < currentDate) {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Cannot book past dates. Please select today or a future date.' });
//     }
    
//     // If booking is for today, check time is not in the past
//     if (bookingDateOnly.getTime() === currentDate.getTime() && bookingDateTime < currentServerTime) {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Booking time must be in the future. Current server time: ' + currentServerTime.toTimeString().slice(0, 5) });
//     }

//     // Rule 3: Check for conflicting bookings
//     const [conflicts] = await connection.execute(
//       `SELECT id FROM bookings 
//        WHERE lab_id = ? 
//          AND booking_date = ? 
//          AND status = 'confirmed'
//          AND start_time < ? 
//          AND end_time > ?`,
//       [lab_id, booking_date, end_time, start_time]
//     );

//     if (conflicts.length > 0) {
//       await connection.rollback();
//       return res.status(409).json({ error: 'Time slot already booked. Please select a different time.' });
//     }

//     // Rule 4: Check lab availability and get lab details
//     const [lab] = await connection.execute(
//       'SELECT * FROM labs WHERE id = ? AND is_active = 1',
//       [lab_id]
//     );

//     if (lab.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ error: 'Lab not found or unavailable' });
//     }

//     // Rule 5: Validate BC number if provided
//     if (bc_number) {
//       const [bcCheck] = await connection.execute(
//         'SELECT id FROM users WHERE bc_number = ? AND id = ?',
//         [bc_number, req.user.id]
//       );
      
//       if (bcCheck.length === 0) {
//         await connection.rollback();
//         return res.status(400).json({ error: 'Invalid BC number' });
//       }
//     }

//     // Create the booking
//     const [result] = await connection.execute(
//       `INSERT INTO bookings (
//         lab_id, user_id, bc_number, start_time, end_time, 
//         booking_date, duration_hours, purpose, status, created_at
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', NOW())`,
//       [lab_id, req.user.id, bc_number || req.user.bc_number, start_time, end_time, booking_date, duration, purpose || 'Auto-booking via Lab Map']
//     );

//     const bookingId = result.insertId;

//     await connection.commit();

//     // Fetch complete booking details for response
//     const [newBooking] = await pool.execute(
//       `SELECT 
//         b.*, 
//         l.name as lab_name, 
//         l.building,
//         l.capacity,
//         l.is_ac,
//         l.facilities,
//         u.name as user_name,
//         u.department,
//         u.bc_number
//        FROM bookings b
//        JOIN labs l ON b.lab_id = l.id
//        JOIN users u ON b.user_id = u.id
//        WHERE b.id = ?`,
//       [bookingId]
//     );

//     const bookingData = newBooking[0];

//     // Log to audit
//     await AuditLog.logAction(
//       req.user.id, 
//       'booking_created', 
//       lab_id, 
//       bookingId, 
//       null, 
//       bookingData,
//       req.ip,
//       req.get('user-agent')
//     );

//     // Emit real-time updates
//     emitToLab(lab_id, 'booking-created', {
//       bookingId,
//       lab_id,
//       lab_name: bookingData.lab_name,
//       date: booking_date,
//       time: `${start_time} - ${end_time}`,
//       user: req.user.name,
//       status: 'confirmed'
//     });

//     emitToUser(req.user.id, 'booking-created', {
//       bookingId,
//       lab_name: bookingData.lab_name,
//       date: booking_date,
//       time: `${start_time} - ${end_time}`,
//       message: 'Your booking has been confirmed'
//     });

//     emitToAdmins('admin-notification', {
//       type: 'new_booking',
//       message: `New booking created by ${req.user.name}`,
//       data: {
//         bookingId,
//         labName: bookingData.lab_name,
//         date: booking_date,
//         time: `${start_time} - ${end_time}`,
//         user: req.user.name
//       }
//     });

//     res.status(201).json({ 
//       success: true, 
//       message: 'Booking created successfully',
//       booking: bookingData 
//     });

//   } catch (error) {
//     await connection.rollback();
//     console.error('Create booking error:', error);
//     res.status(500).json({ error: 'Failed to create booking: ' + error.message });
//   } finally {
//     connection.release();
//   }
// };

// const getUserBookings = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { start_date, end_date } = req.query;

//     if (!userId) {
//       return res.status(401).json({ error: 'User not authenticated' });
//     }

//     let query = `
//       SELECT 
//         b.id,
//         b.lab_id,
//         b.user_id,
//         b.bc_number,
//         b.start_time,
//         b.end_time,
//         b.booking_date,
//         b.duration_hours,
//         b.purpose,
//         b.status,
//         b.created_at,
//         b.updated_at,
//         l.name as lab_name,
//         l.building,
//         l.capacity,
//         l.is_ac,
//         u.name as user_name
//        FROM bookings b
//        INNER JOIN labs l ON b.lab_id = l.id
//        INNER JOIN users u ON b.user_id = u.id
//     `;
    
//     const params = [];
    
//     // If user is admin, get all bookings, otherwise get user's bookings
//     if (req.user.role === 'admin') {
//       // Admin can see all bookings
//     } else {
//       query += ` WHERE b.user_id = ?`;
//       params.push(userId);
//     }
    
//     // Add date filtering if provided
//     if (start_date && end_date) {
//       query += req.user.role === 'admin' ? ' WHERE' : ' AND';
//       query += ` b.booking_date BETWEEN ? AND ?`;
//       params.push(start_date, end_date);
//     }
    
//     query += ` ORDER BY b.booking_date DESC, b.start_time ASC`;
    
//     // For timeline, don't limit the results
//     if (!start_date && !end_date) {
//       query += ` LIMIT 50`;
//     }
    
//     const [bookings] = await pool.execute(query, params);

//     res.json({
//       success: true,
//       bookings: bookings,
//       pagination: {
//         total: bookings.length,
//         limit: 50,
//         offset: 0,
//         hasMore: false
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching user bookings:', error);
//     res.status(500).json({ 
//       error: 'Failed to fetch bookings',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// const getBookingById = async (req, res) => {
//   try {
//     const { bookingId } = req.params;

//     const [bookings] = await pool.execute(
//       `SELECT 
//         b.*, 
//         l.name as lab_name, 
//         l.building,
//         l.capacity,
//         l.is_ac,
//         l.facilities,
//         u.name as user_name,
//         u.department,
//         u.bc_number
//        FROM bookings b
//        JOIN labs l ON b.lab_id = l.id
//        JOIN users u ON b.user_id = u.id
//        WHERE b.id = ? AND (b.user_id = ? OR ? = 'admin')`,
//       [bookingId, req.user.id, req.user.role]
//     );

//     if (bookings.length === 0) {
//       return res.status(404).json({ error: 'Booking not found' });
//     }

//     res.json({ 
//       success: true, 
//       booking: bookings[0] 
//     });

//   } catch (error) {
//     console.error('Get booking by id error:', error);
//     res.status(500).json({ error: 'Failed to fetch booking: ' + error.message });
//   }
// };

// const cancelBooking = async (req, res) => {
//   const connection = await pool.getConnection();
//   try {
//     await connection.beginTransaction();

//     const { bookingId } = req.params;
//     const { reason } = req.body;
//     const today = new Date().toISOString().split('T')[0];

//     // Fetch booking with lock for update
//     const [booking] = await connection.execute(
//       'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
//       [bookingId]
//     );

//     if (booking.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ error: 'Booking not found' });
//     }

//     // Check if user owns the booking or is admin
//     if (booking[0].user_id !== req.user.id && req.user.role !== 'admin') {
//       await connection.rollback();
//       return res.status(403).json({ error: 'Not authorized to cancel this booking' });
//     }

//     // Validate cancellation rules
//     if (booking[0].booking_date < today) {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Cannot cancel past bookings' });
//     }

//     if (booking[0].booking_date === today) {
//       const currentTime = new Date().toTimeString().slice(0, 5);
//       if (booking[0].start_time <= currentTime) {
//         await connection.rollback();
//         return res.status(400).json({ error: 'Cannot cancel booking that has already started' });
//       }
//     }

//     if (booking[0].status === 'cancelled') {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Booking already cancelled' });
//     }

//     if (booking[0].status === 'completed') {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Cannot cancel completed booking' });
//     }

//     // Update booking status
//     await connection.execute(
//       'UPDATE bookings SET status = "cancelled" WHERE id = ?',
//       [bookingId]
//     );

//     await connection.commit();

//     // Fetch updated booking for response
//     const [updatedBooking] = await pool.execute(
//       `SELECT b.*, l.name as lab_name, l.building 
//        FROM bookings b
//        JOIN labs l ON b.lab_id = l.id
//        WHERE b.id = ?`,
//       [bookingId]
//     );

//     // Log to audit
//     await AuditLog.logAction(
//       req.user.id, 
//       'booking_cancelled', 
//       booking[0].lab_id, 
//       bookingId, 
//       booking[0], 
//       { ...booking[0], status: 'cancelled', cancellation_reason: reason },
//       req.ip,
//       req.get('user-agent')
//     );

//     // Emit socket events
//     emitToLab(booking[0].lab_id, 'booking-cancelled', { 
//       bookingId,
//       lab_id: booking[0].lab_id,
//       lab_name: updatedBooking[0].lab_name,
//       date: booking[0].booking_date,
//       time: `${booking[0].start_time} - ${booking[0].end_time}`,
//       status: 'cancelled',
//       cancelled_by: req.user.name,
//       reason: reason
//     });
    
//     emitToUser(booking[0].user_id, 'booking-cancelled', {
//       bookingId,
//       lab_name: updatedBooking[0].lab_name,
//       date: booking[0].booking_date,
//       time: `${booking[0].start_time} - ${booking[0].end_time}`,
//       message: 'Your booking has been cancelled',
//       reason: reason
//     });

//     if (booking[0].user_id !== req.user.id) {
//       emitToAdmins('admin-notification', {
//         type: 'booking-cancelled',
//         message: `Booking cancelled by admin ${req.user.name}`,
//         data: {
//           bookingId,
//           labName: updatedBooking[0].lab_name,
//           user: booking[0].user_name,
//           reason
//         }
//       });
//     }

//     res.json({ 
//       success: true, 
//       message: 'Booking cancelled successfully',
//       booking: updatedBooking[0]
//     });

//   } catch (error) {
//     await connection.rollback();
//     console.error('Cancel booking error:', error);
//     res.status(500).json({ error: 'Failed to cancel booking: ' + error.message });
//   } finally {
//     connection.release();
//   }
// };

// const checkAvailability = async (req, res) => {
//   try {
//     const { lab_id, date, start_time, end_time } = req.query;

//     if (!lab_id || !date) {
//       return res.status(400).json({ error: 'lab_id and date are required' });
//     }

//     // If specific time range provided, check that slot
//     if (start_time && end_time) {
//       const [conflicts] = await pool.execute(
//         `SELECT id FROM bookings 
//          WHERE lab_id = ? 
//            AND booking_date = ? 
//            AND status = 'confirmed'
//            AND start_time < ? 
//            AND end_time > ?`,
//         [lab_id, date, end_time, start_time]
//       );

//       return res.json({
//         success: true,
//         available: conflicts.length === 0,
//         lab_id,
//         date,
//         start_time,
//         end_time
//       });
//     }

//     // Otherwise return all booked slots for the day
//     const [bookings] = await pool.execute(
//       `SELECT start_time, end_time FROM bookings 
//        WHERE lab_id = ? AND booking_date = ? AND status = 'confirmed'
//        ORDER BY start_time`,
//       [lab_id, date]
//     );

//     const { generateTimeSlots, isTimeSlotAvailable } = require('../utils/timeSlots');
//     const allSlots = generateTimeSlots();
    
//     const availability = allSlots.map(slot => ({
//       ...slot,
//       available: isTimeSlotAvailable(bookings, slot.start, slot.end)
//     }));

//     res.json({
//       success: true,
//       lab_id,
//       date,
//       bookedSlots: bookings,
//       availability,
//       totalSlots: allSlots.length,
//       availableSlots: availability.filter(s => s.available).length
//     });

//   } catch (error) {
//     console.error('Check availability error:', error);
//     res.status(500).json({ error: 'Failed to check availability: ' + error.message });
//   }
// };

// const getUpcomingBookings = async (req, res) => {
//   try {
//     const today = new Date().toISOString().split('T')[0];
//     const currentTime = new Date().toTimeString().slice(0, 5);

//     const [bookings] = await pool.execute(
//       `SELECT 
//         b.*, 
//         l.name as lab_name, 
//         l.building,
//         l.capacity,
//         l.is_ac,
//         u.name as user_name,
//         u.department,
//         u.bc_number
//        FROM bookings b
//        JOIN labs l ON b.lab_id = l.id
//        JOIN users u ON b.user_id = u.id
//        WHERE b.user_id = ? 
//          AND b.status != 'cancelled'
//          AND (b.booking_date > ? OR (b.booking_date = ? AND b.end_time > ?))
//        ORDER BY b.booking_date ASC, b.start_time ASC`,
//       [req.user.id, today, today, currentTime]
//     );

//     res.json({
//       success: true,
//       bookings,
//       total: bookings.length
//     });

//   } catch (error) {
//     console.error('Get upcoming bookings error:', error);
//     res.status(500).json({ error: 'Failed to fetch upcoming bookings: ' + error.message });
//   }
// };

// const getBookingHistory = async (req, res) => {
//   try {
//     const { page = 1, limit = 20 } = req.query;
//     const userId = req.user.id;
    
//     const pageInt = parseInt(page, 10);
//     const limitInt = parseInt(limit, 10);
//     const offset = (pageInt - 1) * limitInt;

//     // First, get total count
//     const [countResult] = await pool.execute(
//       `SELECT COUNT(*) as total 
//        FROM bookings 
//        WHERE user_id = ? AND (status = 'completed' OR status = 'cancelled')`,
//       [userId]
//     );

//     const total = countResult[0].total;

//     if (total === 0) {
//       return res.json({
//         success: true,
//         bookings: [],
//         pagination: {
//           total: 0,
//           page: pageInt,
//           limit: limitInt,
//           pages: 0
//         }
//       });
//     }

//     // Get paginated results with parameterized LIMIT/OFFSET
//     const [bookings] = await pool.execute(
//       `SELECT 
//         b.*, 
//         l.name as lab_name, 
//         l.building
//        FROM bookings b
//        JOIN labs l ON b.lab_id = l.id
//        WHERE b.user_id = ? 
//          AND (b.status = 'completed' OR b.status = 'cancelled')
//        ORDER BY b.booking_date DESC, b.start_time DESC
//        LIMIT ? OFFSET ?`,
//       [userId, limitInt, offset]
//     );

//     res.json({
//       success: true,
//       bookings,
//       pagination: {
//         total,
//         page: pageInt,
//         limit: limitInt,
//         pages: Math.ceil(total / limitInt)
//       }
//     });

//   } catch (error) {
//     console.error('Get booking history error:', error);
//     res.status(500).json({ error: 'Failed to fetch booking history: ' + error.message });
//   }
// };

// const updateBooking = async (req, res) => {
//   const connection = await pool.getConnection();
//   try {
//     await connection.beginTransaction();

//     const { bookingId } = req.params;
//     const { start_time, end_time, booking_date, purpose } = req.body;

//     // Fetch existing booking
//     const [booking] = await connection.execute(
//       'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
//       [bookingId]
//     );

//     if (booking.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ error: 'Booking not found' });
//     }

//     // Check ownership
//     if (booking[0].user_id !== req.user.id && req.user.role !== 'admin') {
//       await connection.rollback();
//       return res.status(403).json({ error: 'Not authorized to update this booking' });
//     }

//     // Validate if update is allowed
//     const today = new Date().toISOString().split('T')[0];
//     if (booking[0].booking_date < today) {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Cannot update past bookings' });
//     }

//     if (booking[0].status !== 'confirmed') {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Can only update confirmed bookings' });
//     }

//     // Calculate new duration if times changed
//     let duration = booking[0].duration_hours;
//     if (start_time && end_time) {
//       duration = calculateDuration(start_time, end_time);
      
//       if (duration > 10.5) {
//         await connection.rollback();
//         return res.status(400).json({ error: 'Maximum 10.5 hours allowed' });
//       }

//       if (duration < 0.5) {
//         await connection.rollback();
//         return res.status(400).json({ error: 'Minimum 0.5 hours required' });
//       }
//     }

//     // Check for conflicts if date/time changed
//     if (start_time || end_time || booking_date) {
//       const checkDate = booking_date || booking[0].booking_date;
//       const checkStart = start_time || booking[0].start_time;
//       const checkEnd = end_time || booking[0].end_time;

//       const [conflicts] = await connection.execute(
//         `SELECT id FROM bookings 
//          WHERE lab_id = ? 
//            AND booking_date = ? 
//            AND status = 'confirmed' 
//            AND id != ?
//            AND start_time < ? 
//            AND end_time > ?`,
//         [
//           booking[0].lab_id, 
//           checkDate, 
//           bookingId,
//           checkEnd, 
//           checkStart
//         ]
//       );

//       if (conflicts.length > 0) {
//         await connection.rollback();
//         return res.status(400).json({ error: 'Time slot conflict with existing booking' });
//       }
//     }

//     // Build update query dynamically
//     const updates = [];
//     const params = [];

//     if (start_time) {
//       updates.push('start_time = ?');
//       params.push(start_time);
//     }
//     if (end_time) {
//       updates.push('end_time = ?');
//       params.push(end_time);
//     }
//     if (booking_date) {
//       updates.push('booking_date = ?');
//       params.push(booking_date);
//     }
//     if (duration !== booking[0].duration_hours) {
//       updates.push('duration_hours = ?');
//       params.push(duration);
//     }
//     if (purpose) {
//       updates.push('purpose = ?');
//       params.push(purpose);
//     }

//     if (updates.length === 0) {
//       await connection.rollback();
//       return res.status(400).json({ error: 'No updates provided' });
//     }

//     params.push(bookingId);

//     await connection.execute(
//       `UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`,
//       params
//     );

//     await connection.commit();

//     // Fetch updated booking
//     const [updatedBooking] = await pool.execute(
//       `SELECT b.*, l.name as lab_name, l.building 
//        FROM bookings b
//        JOIN labs l ON b.lab_id = l.id
//        WHERE b.id = ?`,
//       [bookingId]
//     );

//     // Log to audit
//     await AuditLog.logAction(
//       req.user.id, 
//       'booking_updated', 
//       booking[0].lab_id, 
//       bookingId, 
//       booking[0], 
//       updatedBooking[0],
//       req.ip,
//       req.get('user-agent')
//     );

//     // Emit socket events
//     emitToLab(booking[0].lab_id, 'booking-updated', updatedBooking[0]);
//     emitToUser(booking[0].user_id, 'booking-updated', updatedBooking[0]);

//     res.json({ 
//       success: true, 
//       message: 'Booking updated successfully',
//       booking: updatedBooking[0]
//     });

//   } catch (error) {
//     await connection.rollback();
//     console.error('Update booking error:', error);
//     res.status(500).json({ error: 'Failed to update booking: ' + error.message });
//   } finally {
//     connection.release();
//   }
// };

// const getTodayBookings = async (req, res) => {
//   try {
//     const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
//     const [bookings] = await pool.execute(
//       `SELECT 
//         b.id,
//         b.user_id,
//         b.lab_id,
//         b.start_time,
//         b.end_time,
//         b.booking_date,
//         b.duration_hours,
//         b.purpose,
//         b.status,
//         b.created_at,
//         b.updated_at,
//         l.name as lab_name,
//         l.building,
//         l.capacity,
//         l.is_ac,
//         u.name as user_name,
//         u.department,
//         u.bc_number
//        FROM bookings b
//        INNER JOIN labs l ON b.lab_id = l.id
//        INNER JOIN users u ON b.user_id = u.id
//        WHERE b.booking_date = ?
//        ORDER BY b.start_time ASC`,
//       [today]
//     );

//     res.json({
//       success: true,
//       bookings: bookings,
//       date: today,
//       total: bookings.length
//     });

//   } catch (error) {
//     console.error('Error fetching today bookings:', error);
//     res.status(500).json({ 
//       error: 'Failed to fetch today bookings',
//       details: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// const approveBooking = async (req, res) => {
//   const connection = await pool.getConnection();
//   try {
//     await connection.beginTransaction();

//     const { bookingId } = req.params;
//     const { approved, reason } = req.body;

//     // Only admins can approve bookings
//     if (req.user.role !== 'admin') {
//       await connection.rollback();
//       return res.status(403).json({ error: 'Admin access required' });
//     }

//     // Fetch booking with lock
//     const [booking] = await connection.execute(
//       'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
//       [bookingId]
//     );

//     if (booking.length === 0) {
//       await connection.rollback();
//       return res.status(404).json({ error: 'Booking not found' });
//     }

//     const bookingData = booking[0];

//     if (bookingData.status !== 'pending') {
//       await connection.rollback();
//       return res.status(400).json({ error: 'Booking is not pending' });
//     }

//     let newStatus = approved ? 'confirmed' : 'rejected';

//     // If approving, check for conflicts again
//     if (approved) {
//       const [conflicts] = await connection.execute(
//         `SELECT id FROM bookings 
//          WHERE lab_id = ? 
//            AND booking_date = ? 
//            AND status = 'confirmed'
//            AND start_time < ? 
//            AND end_time > ?
//            AND id != ?`,
//         [bookingData.lab_id, bookingData.booking_date, bookingData.end_time, bookingData.start_time, bookingId]
//       );

//       if (conflicts.length > 0) {
//         await connection.rollback();
//         return res.status(400).json({ error: 'Time slot now has conflicts. Cannot approve.' });
//       }
//     }

//     // Update booking status
//     await connection.execute(
//       'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
//       [newStatus, bookingId]
//     );

//     await connection.commit();

//     // Fetch updated booking
//     const [updatedBooking] = await pool.execute(
//       `SELECT b.*, l.name as lab_name, l.building, u.name as user_name
//        FROM bookings b
//        JOIN labs l ON b.lab_id = l.id
//        JOIN users u ON b.user_id = u.id
//        WHERE b.id = ?`,
//       [bookingId]
//     );

//     const responseBooking = { ...updatedBooking[0], approval_reason: reason };

//     // Log to audit
//     await AuditLog.logAction(
//       req.user.id, 
//       approved ? 'booking_approved' : 'booking_rejected', 
//       bookingData.lab_id, 
//       bookingId, 
//       bookingData, 
//       responseBooking,
//       req.ip,
//       req.get('user-agent')
//     );

//     // Emit socket events
//     if (approved) {
//       emitToUser(bookingData.user_id, 'booking-approved', responseBooking);
//       emitToLab(bookingData.lab_id, 'booking-approved', responseBooking);
//     } else {
//       emitToUser(bookingData.user_id, 'booking-rejected', responseBooking);
//     }

//     res.json({
//       success: true,
//       message: `Booking ${approved ? 'approved' : 'rejected'} successfully`,
//       booking: responseBooking
//     });

//   } catch (error) {
//     await connection.rollback();
//     console.error('Approve booking error:', error);
//     res.status(500).json({ error: 'Failed to process approval: ' + error.message });
//   } finally {
//     connection.release();
//   }
// };

// const getPendingBookings = async (req, res) => {
//   try {
//     // Only admins can view pending bookings
//     if (req.user.role !== 'admin') {
//       return res.status(403).json({ error: 'Admin access required' });
//     }

//     const [bookings] = await pool.execute(
//       `SELECT 
//         b.*,
//         l.name as lab_name,
//         l.building,
//         u.name as user_name,
//         u.department,
//         u.bc_number as user_bc_number,
//         (SELECT COUNT(*) FROM bookings b2 
//          WHERE b2.lab_id = b.lab_id 
//            AND b2.booking_date = b.booking_date 
//            AND b2.status = 'pending'
//            AND b2.start_time < b.start_time 
//            AND b2.end_time > b.start_time
//          AND b2.created_at < b.created_at) as queue_position
//        FROM bookings b
//        JOIN labs l ON b.lab_id = l.id
//        JOIN users u ON b.user_id = u.id
//        WHERE b.status = 'pending'
//        ORDER BY b.booking_date ASC, b.created_at ASC
//        LIMIT 50`
//     );

//     res.json({
//       success: true,
//       bookings: bookings,
//       total: bookings.length
//     });

//   } catch (error) {
//     console.error('Get pending bookings error:', error);
//     res.status(500).json({ error: 'Failed to fetch pending bookings: ' + error.message });
//   }
// };

// module.exports = {
//   createBooking,
//   getUserBookings,
//   getBookingById,
//   cancelBooking,
//   updateBooking,
//   checkAvailability,
//   getUpcomingBookings,
//   getBookingHistory,
//   approveBooking,
//   getPendingBookings,
//   getTodayBookings
// };

const { pool } = require('../config/database');
const { emitToLab, emitToUser, emitToAdmins } = require('../config/socket');
const { calculateDuration } = require('../utils/timeSlots');
const AuditLog = require('../models/AuditLog');

// In bookingController.js, fix the createBooking function
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

    // Rule 2: No past booking validation (enhanced)
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
      return res.status(400).json({ error: 'Cannot book past dates. Please select today or a future date.' });
    }
    
    // If booking is for today, check time is not in the past
    if (bookingDateOnly.getTime() === currentDate.getTime() && bookingDateTime < currentServerTime) {
      await connection.rollback();
      return res.status(400).json({ error: 'Booking time must be in the future.' });
    }

    // Check for conflicting bookings
    const [conflicts] = await connection.execute(
      `SELECT id FROM bookings 
       WHERE lab_id = ? 
         AND booking_date = ? 
         AND status = 'confirmed'
         AND start_time < ? 
         AND end_time > ?`,
      [lab_id, booking_date, end_time, start_time]
    );

    if (conflicts.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Time slot already booked' });
    }

    // Create booking
    const [result] = await connection.execute(
      `INSERT INTO bookings
       (lab_id, user_id, bc_number, start_time, end_time, booking_date, duration_hours, purpose, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        lab_id,
        req.user.id,
        bc_number || req.user.bc_number,
        start_time,
        end_time,
        booking_date,
        duration,
        purpose || null
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
        u.department
       FROM bookings b
       JOIN labs l ON b.lab_id = l.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ?`,
      [result.insertId]
    );

    const bookingData = {
      ...newBooking[0],
      queue_position: 0
    };

    // Emit socket events to update the lab map
    const { emitToLab, emitToUser, emitToAdmins } = require('../config/socket');
    
    emitToUser(req.user.id, 'booking-confirmed', bookingData);
    emitToLab(lab_id, 'booking-created', {
      booking: bookingData,
      lab_id: lab_id,
      lab_name: bookingData.lab_name,
      status: 'booked'
    });
    emitToAdmins('booking-created', bookingData);

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully!',
      booking: bookingData
    });

  } catch (error) {
    await connection.rollback();
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking: ' + error.message });
  } finally {
    connection.release();
  }
};

// Add the missing functions from your backup file
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
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check if user owns the booking or is admin
    if (booking[0].user_id !== req.user.id && req.user.role !== 'admin') {
      await connection.rollback();
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    // Validate cancellation rules
    if (booking[0].booking_date < today) {
      await connection.rollback();
      return res.status(400).json({ error: 'Cannot cancel past bookings' });
    }

    if (booking[0].booking_date === today) {
      const currentTime = new Date().toTimeString().slice(0, 5);
      if (booking[0].start_time <= currentTime) {
        await connection.rollback();
        return res.status(400).json({ error: 'Cannot cancel booking that has already started' });
      }
    }

    if (booking[0].status === 'cancelled') {
      await connection.rollback();
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    if (booking[0].status === 'completed') {
      await connection.rollback();
      return res.status(400).json({ error: 'Cannot cancel completed booking' });
    }

    // Update booking status
    await connection.execute(
      'UPDATE bookings SET status = "cancelled" WHERE id = ?',
      [bookingId]
    );

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

    // Get lab name for socket emissions
    const labName = updatedBooking[0]?.lab_name || 'Lab';

    // Emit socket events for real-time update
    emitToLab(booking[0].lab_id, 'booking-cancelled', { 
      bookingId,
      labId: booking[0].lab_id,
      labName: labName,
      date: booking[0].booking_date,
      startTime: booking[0].start_time,
      endTime: booking[0].end_time,
      status: 'available',
      cancelled_by: req.user.name,
      reason: reason,
      timestamp: new Date().toISOString()
    });
    
    // Emit room status update to change from booked to available
    emitToLab(booking[0].lab_id, 'room-status-update', {
      labId: booking[0].lab_id,
      status: 'available',
      bookingId: bookingId,
      timestamp: new Date().toISOString()
    });
    
    // Notify the user who made the booking
    emitToUser(booking[0].user_id, 'booking-cancelled', {
      bookingId,
      labName: labName,
      date: booking[0].booking_date,
      time: `${booking[0].start_time} - ${booking[0].end_time}`,
      message: 'Your booking has been cancelled',
      reason: reason,
      timestamp: new Date().toISOString()
    });

    // Notify admins
    if (booking[0].user_id !== req.user.id) {
      emitToAdmins('admin-notification', {
        type: 'booking-cancelled',
        message: `Booking cancelled by admin ${req.user.name}`,
        data: {
          bookingId,
          labName: labName,
          user: booking[0].user_name,
          reason
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({ 
      success: true, 
      message: 'Booking cancelled successfully',
      booking: updatedBooking[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: 'Failed to cancel booking: ' + error.message });
  } finally {
    connection.release();
  }
};

const checkAvailability = async (req, res) => {
  try {
    const { lab_id, date, start_time, end_time } = req.query;

    if (!lab_id || !date) {
      return res.status(400).json({ error: 'lab_id and date are required' });
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

    const { generateTimeSlots, isTimeSlotAvailable } = require('../utils/timeSlots');
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
    console.error('Check availability error:', error);
    res.status(500).json({ error: 'Failed to check availability: ' + error.message });
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

    // Get paginated results
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
    console.error('Get booking history error:', error);
    res.status(500).json({ error: 'Failed to fetch booking history: ' + error.message });
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
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check ownership
    if (booking[0].user_id !== req.user.id && req.user.role !== 'admin') {
      await connection.rollback();
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }

    // Validate if update is allowed
    const today = new Date().toISOString().split('T')[0];
    if (booking[0].booking_date < today) {
      await connection.rollback();
      return res.status(400).json({ error: 'Cannot update past bookings' });
    }

    if (booking[0].status !== 'confirmed') {
      await connection.rollback();
      return res.status(400).json({ error: 'Can only update confirmed bookings' });
    }

    // Calculate new duration if times changed
    let duration = booking[0].duration_hours;
    if (start_time && end_time) {
      duration = calculateDuration(start_time, end_time);
      
      if (duration > 10.5) {
        await connection.rollback();
        return res.status(400).json({ error: 'Maximum 10.5 hours allowed' });
      }

      if (duration < 0.5) {
        await connection.rollback();
        return res.status(400).json({ error: 'Minimum 0.5 hours required' });
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
        return res.status(400).json({ error: 'Time slot conflict with existing booking' });
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
      return res.status(400).json({ error: 'No updates provided' });
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

    // Emit socket events for real-time update
    emitToLab(booking[0].lab_id, 'booking-updated', updatedBooking[0]);
    emitToUser(booking[0].user_id, 'booking-updated', updatedBooking[0]);

    res.json({ 
      success: true, 
      message: 'Booking updated successfully',
      booking: updatedBooking[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error('Update booking error:', error);
    res.status(500).json({ error: 'Failed to update booking: ' + error.message });
  } finally {
    connection.release();
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
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Fetch booking with lock
    const [booking] = await connection.execute(
      'SELECT * FROM bookings WHERE id = ? FOR UPDATE',
      [bookingId]
    );

    if (booking.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Booking not found' });
    }

    const bookingData = booking[0];

    if (bookingData.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: 'Booking is not pending' });
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
        return res.status(400).json({ error: 'Time slot now has conflicts. Cannot approve.' });
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
      // Emit to lab room for real-time status update
      emitToLab(bookingData.lab_id, 'booking-approved', responseBooking);
      emitToLab(bookingData.lab_id, 'room-status-update', {
        labId: bookingData.lab_id,
        status: 'booked',
        bookingId: bookingId,
        startTime: bookingData.start_time,
        endTime: bookingData.end_time,
        bookingDate: bookingData.booking_date,
        timestamp: new Date().toISOString()
      });
      
      emitToUser(bookingData.user_id, 'booking-approved', {
        ...responseBooking,
        message: `Your booking for ${updatedBooking[0].lab_name} has been approved!`
      });
    } else {
      emitToUser(bookingData.user_id, 'booking-rejected', {
        ...responseBooking,
        message: `Your booking for ${updatedBooking[0].lab_name} has been rejected.`,
        reason: reason
      });
    }

    emitToAdmins('admin-notification', {
      type: approved ? 'booking-approved' : 'booking-rejected',
      message: `Booking ${approved ? 'approved' : 'rejected'} for ${updatedBooking[0].lab_name} by ${req.user.name}`,
      booking: responseBooking,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Booking ${approved ? 'approved' : 'rejected'} successfully`,
      booking: responseBooking
    });

  } catch (error) {
    await connection.rollback();
    console.error('Approve booking error:', error);
    res.status(500).json({ error: 'Failed to process approval: ' + error.message });
  } finally {
    connection.release();
  }
};

const getPendingBookings = async (req, res) => {
  try {
    // Only admins can view pending bookings
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
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
    console.error('Get pending bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch pending bookings: ' + error.message });
  }
};

const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [bookings] = await pool.execute(
      `SELECT 
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
        l.is_ac
       FROM bookings b
       INNER JOIN labs l ON b.lab_id = l.id
       WHERE b.user_id = ?
       ORDER BY b.booking_date DESC, b.start_time ASC
       LIMIT 50`,
      [userId]
    );

    res.json({
      success: true,
      bookings: bookings,
      pagination: {
        total: bookings.length,
        limit: 50,
        offset: 0,
        hasMore: false
      }
    });

  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch bookings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json({ 
      success: true, 
      booking: bookings[0] 
    });

  } catch (error) {
    console.error('Get booking by id error:', error);
    res.status(500).json({ error: 'Failed to fetch booking: ' + error.message });
  }
};

const getTodayBookings = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
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
    console.error('Error fetching today bookings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch today bookings',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    console.error('Get upcoming bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming bookings: ' + error.message });
  }
};

const processQueue = async (labId, bookingDate, startTime, endTime) => {
  const connection = await pool.getConnection();
  try {
    const [nextInQueue] = await connection.execute(
      `SELECT id FROM bookings 
       WHERE lab_id = ? 
         AND booking_date = ?
         AND status = 'pending'
         AND (
           (start_time <= ? AND end_time > ?) OR
           (start_time < ? AND end_time >= ?) OR
           (start_time >= ? AND end_time <= ?)
         )
       ORDER BY created_at ASC
       LIMIT 1`,
      [labId, bookingDate, startTime, endTime, startTime, endTime, startTime, endTime]
    );

    if (nextInQueue.length > 0) {
      await connection.execute(
        'UPDATE bookings SET status = "confirmed", updated_at = NOW() WHERE id = ?',
        [nextInQueue[0].id]
      );

      const [bookingDetails] = await pool.execute(
        `SELECT b.*, u.name as user_name, l.name as lab_name
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN labs l ON b.lab_id = l.id
         WHERE b.id = ?`,
        [nextInQueue[0].id]
      );

      if (bookingDetails.length > 0) {
        emitToUser(bookingDetails[0].user_id, 'booking-auto-approved', bookingDetails[0]);
        emitToLab(labId, 'booking-confirmed', bookingDetails[0]);
        emitToLab(labId, 'room-status-update', {
          labId: labId,
          status: 'booked',
          bookingId: nextInQueue[0].id,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Process queue error:', error);
  } finally {
    connection.release();
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
  getTodayBookings,
  processQueue
};
