const setupBookingSocketHandlers = (io) => {
  // All socket handlers are now consolidated in socket.js
  // This function is kept for backwards compatibility
};

const emitBookingCreated = (io, labId, bookingData) => {
  if (io) {
    // Emit to lab-specific room
    io.to(`lab-${labId}`).emit('booking-created', {
      lab_id: labId,
      booking: bookingData,
      timestamp: new Date().toISOString()
    });
    
    // Emit to admin room for global updates
    io.to('admin-room').emit('booking-created', {
      lab_id: labId,
      booking: bookingData,
      timestamp: new Date().toISOString()
    });
    
    // Emit room status update
    io.emit('room-status-update', {
      lab_id: labId,
      status: 'occupied',
      timestamp: new Date().toISOString()
    });
    
    // Emit timeline update event
    io.emit('timeline-update', {
      type: 'booking-created',
      lab_id: labId,
      booking: bookingData,
      booking_date: bookingData.booking_date,
      timestamp: new Date().toISOString()
    });
  }
};

const emitBookingCancelled = (io, labId, bookingData) => {
  if (io) {
    // Emit to lab-specific room
    io.to(`lab-${labId}`).emit('booking-cancelled', {
      lab_id: labId,
      booking: bookingData,
      timestamp: new Date().toISOString()
    });
    
    // Emit to admin room for global updates
    io.to('admin-room').emit('booking-cancelled', {
      lab_id: labId,
      booking: bookingData,
      timestamp: new Date().toISOString()
    });
    
    // Emit room status update
    io.emit('room-status-update', {
      lab_id: labId,
      status: 'available',
      timestamp: new Date().toISOString()
    });
    
    // Emit timeline update event
    io.emit('timeline-update', {
      type: 'booking-cancelled',
      lab_id: labId,
      booking: bookingData,
      booking_date: bookingData.booking_date,
      timestamp: new Date().toISOString()
    });
  }
};

const emitBookingUpdated = (io, labId, bookingData) => {
  if (io) {
    // Emit to lab-specific room
    io.to(`lab-${labId}`).emit('booking-updated', {
      lab_id: labId,
      booking: bookingData,
      timestamp: new Date().toISOString()
    });
    
    // Emit to admin room for global updates
    io.to('admin-room').emit('booking-updated', {
      lab_id: labId,
      booking: bookingData,
      timestamp: new Date().toISOString()
    });
    
    // Emit timeline update event
    io.emit('timeline-update', {
      type: 'booking-updated',
      lab_id: labId,
      booking: bookingData,
      booking_date: bookingData.booking_date,
      timestamp: new Date().toISOString()
    });
  }
};

const emitRoomStatusUpdate = (io, labId, status, additionalData = {}) => {
  if (io) {
    io.emit('room-status-update', {
      lab_id: labId,
      status,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
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
  emitRoomStatusUpdate,
  emitUserNotification
};