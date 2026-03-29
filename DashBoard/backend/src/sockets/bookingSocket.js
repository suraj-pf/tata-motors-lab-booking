const setupBookingSocketHandlers = (io) => {
  // All socket handlers are now consolidated in socket.js
  // This function is kept for backwards compatibility
};

const emitBookingCreated = (io, labId, bookingData) => {
  if (io) {
    io.to(`lab-${labId}`).emit('booking-created', bookingData);
  }
};

const emitBookingCancelled = (io, labId, bookingId) => {
  if (io) {
    io.to(`lab-${labId}`).emit('booking-cancelled', { bookingId, labId });
  }
};

const emitBookingUpdated = (io, labId, bookingData) => {
  if (io) {
    io.to(`lab-${labId}`).emit('booking-updated', bookingData);
  }
};

const emitUserNotification = (io, userId, notification) => {
  if (io) {
    io.to(`user-${userId}`).emit('user-notification', notification);
  }
};

module.exports = {
  setupBookingSocketHandlers,
  emitBookingCreated,
  emitBookingCancelled,
  emitBookingUpdated,
  emitUserNotification
};