const { Server } = require('socket.io');
const { setupBookingSocketHandlers } = require('../sockets');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { 
      origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true 
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Single connection handler
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    console.log('Transport:', socket.conn.transport.name);
    
    // Handle authentication
    const token = socket.handshake.auth.token;
    if (token) {
      console.log('Socket authenticated with token');
    }

    // Handle role-based rooms
    const userRole = socket.handshake.query.role;
    if (userRole === 'admin') {
      socket.join('admin-room');
    }
    
    // Lab room management
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

    // Lab-specific room management
    socket.on('join-lab-room', (labId) => {
      socket.join(`lab-${labId}`);
    });

    socket.on('leave-lab-room', (labId) => {
      socket.leave(`lab-${labId}`);
    });

    // User room management
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
    });

    socket.on('leave-user-room', (userId) => {
      socket.leave(`user-${userId}`);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', socket.id, 'Reason:', reason);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Utility function to emit to all users in a lab
const emitToLab = (labId, event, data) => {
  if (io) {
    io.to(`lab-${labId}`).emit(event, data);
  }
};

// Utility function to emit to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user-${userId}`).emit(event, data);
  }
};

// Utility function to emit to all admins
const emitToAdmins = (event, data) => {
  if (io) {
    io.to('admin-room').emit(event, data);
  }
};

module.exports = { 
  initSocket, 
  getIO,
  emitToLab,
  emitToUser,
  emitToAdmins
};