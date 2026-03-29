const { setupBookingSocketHandlers } = require('./bookingSocket');

const initializeSocketHandlers = (io) => {
  setupBookingSocketHandlers(io);
  
  io.on('connection', (socket) => {
    const userRole = socket.handshake.query.role;
    if (userRole === 'admin') {
      socket.join('admin-room');
    }
    
    socket.on('join-labs', (labIds = []) => {
      labIds.forEach(labId => {
        socket.join(`lab-${labId}`);
      });
    });
    
    socket.on('leave-labs', (labIds = []) => {
      labIds.forEach(labId => {
        socket.leave(`lab-${labId}`);
      });
    });
  });
};

module.exports = {
  initializeSocketHandlers
};