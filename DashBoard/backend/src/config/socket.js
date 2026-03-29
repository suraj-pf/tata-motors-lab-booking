// const { Server } = require('socket.io');
// const { setupBookingSocketHandlers } = require('../sockets');

// let io;

// const initSocket = (server) => {
//   io = new Server(server, {
//     cors: { 
//       origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
//       methods: ['GET', 'POST'],
//       credentials: true 
//     },
//     pingTimeout: 60000,
//     pingInterval: 25000,
//     transports: ['websocket', 'polling']
//   });

//   // Single connection handler
//   io.on('connection', (socket) => {
//     console.log('Socket connected:', socket.id);
//     console.log('Transport:', socket.conn.transport.name);
    
//     // Handle authentication
//     const token = socket.handshake.auth.token;
//     if (token) {
//       console.log('Socket authenticated with token');
//     }

//     // Handle role-based rooms
//     const userRole = socket.handshake.query.role;
//     if (userRole === 'admin') {
//       socket.join('admin-room');
//     }
    
//     // Lab room management
//     socket.on('join-labs', (labIds = []) => {
//       labIds.forEach(labId => {
//         socket.join(`lab-${labId}`);
//       });
//     });
    
//     socket.on('leave-labs', (labIds = []) => {
//       labIds.forEach(labId => {
//         socket.leave(`lab-${labId}`);
//       });
//     });

//     // Lab-specific room management
//     socket.on('join-lab-room', (labId) => {
//       socket.join(`lab-${labId}`);
//     });

//     socket.on('leave-lab-room', (labId) => {
//       socket.leave(`lab-${labId}`);
//     });

//     // User room management
//     socket.on('join-user-room', (userId) => {
//       socket.join(`user-${userId}`);
//     });

//     socket.on('leave-user-room', (userId) => {
//       socket.leave(`user-${userId}`);
//     });

//     socket.on('error', (error) => {
//       console.error('Socket error:', error);
//     });

//     socket.on('disconnect', (reason) => {
//       console.log('Socket disconnected:', socket.id, 'Reason:', reason);
//     });
//   });

//   return io;
// };

// const getIO = () => {
//   if (!io) {
//     throw new Error('Socket.io not initialized');
//   }
//   return io;
// };

// // Utility function to emit to all users in a lab
// const emitToLab = (labId, event, data) => {
//   if (io) {
//     io.to(`lab-${labId}`).emit(event, data);
//   }
// };

// // Utility function to emit to specific user
// const emitToUser = (userId, event, data) => {
//   if (io) {
//     io.to(`user-${userId}`).emit(event, data);
//   }
// };

// // Utility function to emit to all admins
// const emitToAdmins = (event, data) => {
//   if (io) {
//     io.to('admin-room').emit(event, data);
//   }
// };

// module.exports = { 
//   initSocket, 
//   getIO,
//   emitToLab,
//   emitToUser,
//   emitToAdmins
// };
// backend/config/socket.js
const { Server } = require('socket.io');

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

  // Track connected clients and their rooms
  const clientRooms = new Map();

  // Single connection handler
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    console.log('Transport:', socket.conn.transport.name);
    
    // Get user info from handshake
    const userId = socket.handshake.query.userId;
    const userRole = socket.handshake.query.role;
    
    // Store client info
    clientRooms.set(socket.id, {
      userId,
      userRole,
      labs: new Set(),
      joinedAt: new Date()
    });
    
    // Handle authentication
    const token = socket.handshake.auth.token;
    if (token) {
      console.log('Socket authenticated with token');
    }
    
    // Join user to their personal room
    if (userId) {
      socket.join(`user-${userId}`);
      console.log(`User ${userId} joined personal room user-${userId}`);
    }
    
    // Handle role-based rooms
    if (userRole === 'admin') {
      socket.join('admin-room');
      console.log(`Admin ${socket.id} joined admin-room`);
    }
    
    // Lab room management (bulk join)
    socket.on('join-labs', (labIds = []) => {
      const clientInfo = clientRooms.get(socket.id);
      if (clientInfo) {
        labIds.forEach(labId => {
          const labRoom = `lab-${labId}`;
          socket.join(labRoom);
          clientInfo.labs.add(labId);
          console.log(`Socket ${socket.id} joined ${labRoom}`);
        });
      }
    });
    
    socket.on('leave-labs', (labIds = []) => {
      const clientInfo = clientRooms.get(socket.id);
      if (clientInfo) {
        labIds.forEach(labId => {
          const labRoom = `lab-${labId}`;
          socket.leave(labRoom);
          clientInfo.labs.delete(labId);
          console.log(`Socket ${socket.id} left ${labRoom}`);
        });
      }
    });

    // Lab-specific room management (single lab)
    socket.on('join-lab-room', (labId) => {
      const labRoom = `lab-${labId}`;
      socket.join(labRoom);
      const clientInfo = clientRooms.get(socket.id);
      if (clientInfo) {
        clientInfo.labs.add(labId);
      }
      console.log(`Socket ${socket.id} joined ${labRoom}`);
      
      // Confirm join to client
      socket.emit('lab-room-joined', { labId, success: true });
    });

    socket.on('leave-lab-room', (labId) => {
      const labRoom = `lab-${labId}`;
      socket.leave(labRoom);
      const clientInfo = clientRooms.get(socket.id);
      if (clientInfo) {
        clientInfo.labs.delete(labId);
      }
      console.log(`Socket ${socket.id} left ${labRoom}`);
      
      // Confirm leave to client
      socket.emit('lab-room-left', { labId, success: true });
    });

    // User room management
    socket.on('join-user-room', (userId) => {
      socket.join(`user-${userId}`);
      console.log(`Socket ${socket.id} joined user-${userId}`);
    });

    socket.on('leave-user-room', (userId) => {
      socket.leave(`user-${userId}`);
      console.log(`Socket ${socket.id} left user-${userId}`);
    });

    // Admin room management
    socket.on('join-admin-room', () => {
      socket.join('admin-room');
      console.log(`Socket ${socket.id} joined admin-room`);
    });

    // Manual room status update (for admins to trigger updates)
    socket.on('update-room-status', (data) => {
      const { labId, status, bookingId, startTime, endTime, bookingDate } = data;
      if (labId) {
        console.log(`Manual room status update for lab-${labId}:`, status);
        
        // Broadcast to all clients in this lab room
        io.to(`lab-${labId}`).emit('room-status-update', {
          labId,
          status,
          bookingId,
          startTime,
          endTime,
          bookingDate,
          updatedBy: userId || socket.id,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Request current room status (for new connections)
    socket.on('request-room-status', (labId) => {
      console.log(`Socket ${socket.id} requested status for lab-${labId}`);
      // Emit a request for current status - the frontend will handle fetching
      socket.emit('room-status-requested', { labId, timestamp: new Date().toISOString() });
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('Socket error for', socket.id, ':', error);
    });

    // Disconnect handling
    socket.on('disconnect', (reason) => {
      const clientInfo = clientRooms.get(socket.id);
      if (clientInfo) {
        console.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);
        console.log(`Was in labs:`, Array.from(clientInfo.labs));
        clientRooms.delete(socket.id);
      } else {
        console.log(`Socket ${socket.id} disconnected. Reason: ${reason}`);
      }
    });
  });

  // Add middleware for logging all emitted events (optional, for debugging)
  if (process.env.NODE_ENV === 'development') {
    const originalEmit = io.emit;
    io.emit = function(...args) {
      console.log('Socket.io emit:', args[0], args[1] ? 'with data' : '');
      return originalEmit.apply(this, args);
    };
  }

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Enhanced utility function to emit to all users in a lab
const emitToLab = (labId, event, data) => {
  if (io) {
    const labRoom = `lab-${labId}`;
    const enhancedData = {
      ...data,
      labId,
      timestamp: new Date().toISOString(),
      event
    };
    io.to(labRoom).emit(event, enhancedData);
    console.log(`Emitted ${event} to ${labRoom}`, enhancedData);
  } else {
    console.warn(`Cannot emit ${event} to lab-${labId}: Socket.io not initialized`);
  }
};

// Enhanced utility function to emit to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    const userRoom = `user-${userId}`;
    const enhancedData = {
      ...data,
      userId,
      timestamp: new Date().toISOString(),
      event
    };
    io.to(userRoom).emit(event, enhancedData);
    console.log(`Emitted ${event} to ${userRoom}`, enhancedData);
  } else {
    console.warn(`Cannot emit ${event} to user-${userId}: Socket.io not initialized`);
  }
};

// Enhanced utility function to emit to all admins
const emitToAdmins = (event, data) => {
  if (io) {
    const enhancedData = {
      ...data,
      timestamp: new Date().toISOString(),
      event,
      isAdminNotification: true
    };
    io.to('admin-room').emit(event, enhancedData);
    console.log(`Emitted ${event} to admin-room`, enhancedData);
  } else {
    console.warn(`Cannot emit ${event} to admin-room: Socket.io not initialized`);
  }
};

// Utility function to get all clients in a lab room
const getClientsInLab = async (labId) => {
  if (!io) return [];
  const room = io.sockets.adapter.rooms.get(`lab-${labId}`);
  if (!room) return [];
  return Array.from(room);
};

// Utility function to check if a lab room has active clients
const hasClientsInLab = (labId) => {
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(`lab-${labId}`);
  return room ? room.size > 0 : false;
};

module.exports = { 
  initSocket, 
  getIO,
  emitToLab,
  emitToUser,
  emitToAdmins,
  getClientsInLab,
  hasClientsInLab
};