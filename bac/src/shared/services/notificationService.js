const { getIO } = require('../config/socket');

const notificationService = {
  sendBookingNotification: (userId, booking) => {
    try {
      const io = getIO();
      if (!io) return;

      io.to(`user-${userId}`).emit('booking_confirmed', {
        type: 'booking_confirmed',
        booking,
        message: `Booking confirmed for ${booking.lab_name} on ${booking.booking_date}`
      });
    } catch (error) {
      console.error('Error sending booking notification:', error);
    }
  },

  notifyLabUpdate: (labId, updateData) => {
    try {
      const io = getIO();
      if (!io) return;

      io.to(`lab-${labId}`).emit('lab_updated', {
        labId,
        ...updateData
      });
    } catch (error) {
      console.error('Error sending lab update:', error);
    }
  },

  notifyAdmin: (message, data = {}) => {
    try {
      const io = getIO();
      if (!io) return;

      io.emit('admin_notification', {
        message,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  },

  sendToUser: (userId, event, data) => {
    try {
      const io = getIO();
      if (!io) return;

      io.to(`user-${userId}`).emit(event, data);
    } catch (error) {
      console.error('Error sending user notification:', error);
    }
  }
};

module.exports = notificationService;