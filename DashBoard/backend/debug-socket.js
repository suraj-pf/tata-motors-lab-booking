const io = require('socket.io-client');
const readline = require('readline');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('✅ WebSocket connected');
  console.log('Socket ID:', socket.id);
  
  socket.emit('join-user-room', '1');
  console.log('Joined user room: 1');
});

socket.on('booking-created', (data) => {
  console.log('📅 Booking created:', data);
});

socket.on('booking-cancelled', (data) => {
  console.log('❌ Booking cancelled:', data);
});

socket.on('disconnect', () => {
  console.log('❌ WebSocket disconnected');
});

socket.on('connect_error', (err) => {
  console.log('❌ Connection error:', err.message);
});

console.log('🔌 Testing WebSocket connection...');
console.log('Press Ctrl+C to exit');

// Handle graceful shutdown
process.on('SIGINT', () => {
  socket.disconnect();
  process.exit(0);
});
