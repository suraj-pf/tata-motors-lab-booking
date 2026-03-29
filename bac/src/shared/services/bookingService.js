const { pool } = require('../config/database');
const Lab = require('./models/Lab');
const Booking = require('./models/Booking');
const AuditLog = require('./models/AuditLog');

const bookingService = {
  createBooking: async (bookingData, userId, ipAddress, userAgent) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const { lab_id, start_time, end_time, booking_date, bc_number, purpose } = bookingData;
      
      const hasConflict = await Booking.checkConflict(lab_id, booking_date, start_time, end_time);
      if (hasConflict) {
        throw new Error('Time slot already booked');
      }

      const bookingId = await Booking.create({
        lab_id, 
        start_time, 
        end_time, 
        booking_date, 
        bc_number, 
        purpose,
        duration: bookingData.duration
      }, userId);
      
      await AuditLog.logAction(
        userId, 
        'booking_created', 
        lab_id, 
        bookingId, 
        null, 
        bookingData, 
        ipAddress, 
        userAgent
      );
      
      await connection.commit();
      return bookingId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  getUserBookings: async (userId, filters = {}) => {
    try {
      return await Booking.findByUserId(userId, filters);
    } catch (error) {
      console.error('Error in getUserBookings:', error);
      throw error;
    }
  },

  getBookingById: async (bookingId, userId) => {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking || (booking.user_id !== userId && userId !== 'admin')) {
        throw new Error('Booking not found');
      }
      return booking;
    } catch (error) {
      console.error('Error in getBookingById:', error);
      throw error;
    }
  },

  cancelBooking: async (bookingId, userId, ipAddress, userAgent) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const booking = await Booking.findById(bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.user_id !== userId) {
        throw new Error('Not authorized to cancel this booking');
      }

      if (booking.status === 'cancelled') {
        throw new Error('Booking already cancelled');
      }

      const today = new Date().toISOString().split('T')[0];
      if (booking.booking_date < today) {
        throw new Error('Cannot cancel past bookings');
      }

      if (booking.booking_date === today) {
        const currentTime = new Date().toTimeString().slice(0, 5);
        if (booking.start_time <= currentTime) {
          throw new Error('Cannot cancel booking that has already started');
        }
      }

      await Booking.updateStatus(bookingId, 'cancelled');
      
      await AuditLog.logAction(
        userId, 
        'booking_cancelled', 
        booking.lab_id, 
        bookingId, 
        booking, 
        { ...booking, status: 'cancelled' }, 
        ipAddress, 
        userAgent
      );
      
      await connection.commit();
      return { success: true, booking };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  checkAvailability: async (labId, date, startTime, endTime) => {
    try {
      const lab = await Lab.findById(labId);
      if (!lab) throw new Error('Lab not found');

      const conflicts = await Booking.checkConflict(labId, date, startTime, endTime);
      return {
        lab,
        available: !conflicts
      };
    } catch (error) {
      console.error('Error in checkAvailability:', error);
      throw error;
    }
  },

  getUpcomingBookings: async (userId) => {
    try {
      return await Booking.getUpcomingForUser(userId);
    } catch (error) {
      console.error('Error in getUpcomingBookings:', error);
      throw error;
    }
  }
};

module.exports = bookingService;