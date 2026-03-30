const { getIO } = require('./config/socket');

class SocketService {
  constructor() {
    this.userSockets = new Map(); // userId → socketId
  }

  // Add user to socket map
  addUserSocket(userId, socketId) {
    this.userSockets.set(userId, socketId);
  }

  // Remove user socket
  removeUserSocket(userId) {
    this.userSockets.delete(userId);
  }

  // Get socket by user ID
  getUserSocket(userId) {
    return this.userSockets.get(userId);
  }

  // Send to specific user
  sendToUser(userId, event, data) {
    const socketId = this.getUserSocket(userId);
    if (socketId) {
      const io = getIO();
      io.to(socketId).emit(event, data);
    }
  }

  // Broadcast to lab room
  broadcastToLab(labId, event, data) {
    const io = getIO();
    if (io) {
      io.to(`lab-${labId}`).emit(event, data);
    }
  }

  // Handle connection
  handleConnection(socket, user) {
    if (user) {
      this.addUserSocket(user.id, socket.id);
      socket.join(`user-${user.id}`);
      socket.emit('connected', { userId: user.id });
    }
  }

  // Handle disconnect
  handleDisconnect(socketId) {
    // Find and remove user
    for (let [userId, id] of this.userSockets.entries()) {
      if (id === socketId) {
        this.removeUserSocket(userId);
        break;
      }
    }
  }
}

module.exports = new SocketService();
