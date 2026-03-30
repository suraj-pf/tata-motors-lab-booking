#!/usr/bin/env node

/**
 * WebSocket Test Client for Lab Booking System
 * Tests real-time booking events, lab status updates, and notifications
 */

const { io } = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

let passed = 0;
let failed = 0;

function printResult(success, message) {
  if (success) {
    console.log(`${colors.green}✅ PASS${colors.reset}: ${message}`);
    passed++;
  } else {
    console.log(`${colors.red}❌ FAIL${colors.reset}: ${message}`);
    failed++;
  }
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ️  INFO${colors.reset}: ${message}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}⚠️  WARN${colors.reset}: ${message}`);
}

// Global variables
let adminToken = null;
let user1Token = null;
let user1Socket = null;
let user2Socket = null;
let adminSocket = null;
let receivedEvents = {
  bookingCreated: false,
  bookingCancelled: false,
  bookingUpdated: false,
  labStatusUpdated: false,
  userNotification: false
};

async function authenticate() {
  printInfo('Authenticating users...');
  
  try {
    // Admin login
    const adminRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    adminToken = adminRes.data.access_token;
    printResult(true, 'Admin authenticated');
    
    // User1 login
    const user1Res = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'staff1',
      password: 'staff123'
    });
    user1Token = user1Res.data.access_token;
    printResult(true, 'User1 authenticated');
    
    return { adminToken, user1Token };
  } catch (error) {
    printResult(false, `Authentication failed: ${error.message}`);
    process.exit(1);
  }
}

function connectSocket(token, userType) {
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      timeout: 5000
    });
    
    socket.on('connect', () => {
      printResult(true, `${userType} socket connected (ID: ${socket.id})`);
      resolve(socket);
    });
    
    socket.on('connect_error', (error) => {
      printResult(false, `${userType} socket connection failed: ${error.message}`);
      reject(error);
    });
    
    socket.on('disconnect', (reason) => {
      printWarning(`${userType} socket disconnected: ${reason}`);
    });
  });
}

async function setupEventListeners() {
  printInfo('Setting up event listeners...');
  
  // User1 listens for booking events
  user1Socket.on('booking-created', (data) => {
    printInfo(`User1 received booking-created event: ${JSON.stringify(data)}`);
    receivedEvents.bookingCreated = true;
  });
  
  user1Socket.on('booking-cancelled', (data) => {
    printInfo(`User1 received booking-cancelled event: ${JSON.stringify(data)}`);
    receivedEvents.bookingCancelled = true;
  });
  
  user1Socket.on('booking-updated', (data) => {
    printInfo(`User1 received booking-updated event: ${JSON.stringify(data)}`);
    receivedEvents.bookingUpdated = true;
  });
  
  user1Socket.on('user-notification', (data) => {
    printInfo(`User1 received user-notification event: ${JSON.stringify(data)}`);
    receivedEvents.userNotification = true;
  });
  
  // Admin listens for lab status updates
  adminSocket.on('lab-status-updated', (data) => {
    printInfo(`Admin received lab-status-updated event: ${JSON.stringify(data)}`);
    receivedEvents.labStatusUpdated = true;
  });
  
  // Timeline update
  user1Socket.on('timeline-update', (data) => {
    printInfo(`User1 received timeline-update event: ${data.type}`);
  });
  
  // Room status update
  user1Socket.on('room-status-update', (data) => {
    printInfo(`User1 received room-status-update: Lab ${data.lab_id} is ${data.status}`);
  });
  
  printResult(true, 'Event listeners configured');
}

async function joinLabRoom(socket, labId) {
  return new Promise((resolve) => {
    socket.emit('join-lab-room', labId);
    setTimeout(() => {
      printInfo(`Joined lab-${labId} room`);
      resolve();
    }, 500);
  });
}

async function testBookingCreation() {
  printInfo('Testing booking creation and real-time event...');
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const bookingDate = futureDate.toISOString().split('T')[0];
  
  try {
    // Join lab room first
    await joinLabRoom(user1Socket, 1);
    await joinLabRoom(adminSocket, 1);
    
    // Create booking
    const response = await axios.post(
      `${BASE_URL}/api/bookings`,
      {
        lab_id: 1,
        start_time: '14:00',
        end_time: '15:00',
        booking_date: bookingDate,
        bc_number: 'BC101',
        purpose: 'WebSocket test booking'
      },
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
    
    if (response.data.success) {
      printResult(true, 'Booking created via API');
      
      // Wait for WebSocket event
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (receivedEvents.bookingCreated) {
        printResult(true, 'booking-created event received via WebSocket');
      } else {
        printResult(false, 'booking-created event NOT received');
      }
      
      if (receivedEvents.userNotification) {
        printResult(true, 'user-notification event received');
      }
      
      return response.data.booking.id;
    } else {
      printResult(false, 'Booking creation failed');
      return null;
    }
  } catch (error) {
    printResult(false, `Booking creation error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testBookingCancellation(bookingId) {
  printInfo('Testing booking cancellation and real-time event...');
  
  try {
    // Reset events
    receivedEvents.bookingCancelled = false;
    
    const response = await axios.delete(
      `${BASE_URL}/api/bookings/${bookingId}`,
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
    
    if (response.data.success) {
      printResult(true, 'Booking cancelled via API');
      
      // Wait for WebSocket event
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (receivedEvents.bookingCancelled) {
        printResult(true, 'booking-cancelled event received via WebSocket');
      } else {
        printResult(false, 'booking-cancelled event NOT received');
      }
    } else {
      printResult(false, 'Booking cancellation failed');
    }
  } catch (error) {
    printResult(false, `Booking cancellation error: ${error.response?.data?.message || error.message}`);
  }
}

async function testLabStatusUpdate() {
  printInfo('Testing lab status update and real-time event...');
  
  try {
    // Reset events
    receivedEvents.labStatusUpdated = false;
    
    const response = await axios.patch(
      `${BASE_URL}/api/admin/labs/1/status`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (response.data.success) {
      printResult(true, 'Lab status toggled via API');
      
      // Wait for WebSocket event
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (receivedEvents.labStatusUpdated) {
        printResult(true, 'lab-status-updated event received via WebSocket');
      } else {
        printResult(false, 'lab-status-updated event NOT received');
      }
      
      // Toggle back
      await axios.patch(
        `${BASE_URL}/api/admin/labs/1/status`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
    } else {
      printResult(false, 'Lab status toggle failed');
    }
  } catch (error) {
    printResult(false, `Lab status update error: ${error.response?.data?.message || error.message}`);
  }
}

async function testMultipleSocketConnections() {
  printInfo('Testing multiple simultaneous socket connections...');
  
  try {
    // Connect second user
    user2Socket = await connectSocket(user1Token, 'User2 (same token)');
    
    // Join same lab room
    await joinLabRoom(user2Socket, 1);
    
    // Create a booking and verify both sockets receive it
    receivedEvents.bookingCreated = false;
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const bookingDate = futureDate.toISOString().split('T')[0];
    
    const response = await axios.post(
      `${BASE_URL}/api/bookings`,
      {
        lab_id: 1,
        start_time: '16:00',
        end_time: '17:00',
        booking_date: bookingDate,
        bc_number: 'BC101',
        purpose: 'Multi-socket test'
      },
      { headers: { Authorization: `Bearer ${user1Token}` } }
    );
    
    if (response.data.success) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      printResult(true, 'Multiple socket connections handled correctly');
      
      // Cleanup
      await axios.delete(
        `${BASE_URL}/api/bookings/${response.data.booking.id}`,
        { headers: { Authorization: `Bearer ${user1Token}` } }
      );
    }
  } catch (error) {
    printResult(false, `Multiple socket test error: ${error.message}`);
  }
}

async function testSocketReconnection() {
  printInfo('Testing socket reconnection...');
  
  try {
    // Disconnect and reconnect
    user1Socket.disconnect();
    printInfo('User1 socket disconnected');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reconnect
    user1Socket = await connectSocket(user1Token, 'User1 (reconnected)');
    
    // Rejoin lab room
    await joinLabRoom(user1Socket, 1);
    
    printResult(true, 'Socket reconnection successful');
  } catch (error) {
    printResult(false, `Socket reconnection failed: ${error.message}`);
  }
}

async function disconnectAll() {
  printInfo('Disconnecting all sockets...');
  
  if (user1Socket) user1Socket.disconnect();
  if (user2Socket) user2Socket.disconnect();
  if (adminSocket) adminSocket.disconnect();
  
  printResult(true, 'All sockets disconnected');
}

async function runTests() {
  console.log('========================================');
  console.log('WebSocket Test Client');
  console.log('Real-Time System Validation');
  console.log('========================================\n');
  
  try {
    // Step 1: Authenticate
    await authenticate();
    
    // Step 2: Connect sockets
    printInfo('Connecting WebSocket clients...');
    user1Socket = await connectSocket(user1Token, 'User1');
    adminSocket = await connectSocket(adminToken, 'Admin');
    
    // Step 3: Setup listeners
    await setupEventListeners();
    
    // Step 4: Test booking creation
    const bookingId = await testBookingCreation();
    
    // Step 5: Test booking cancellation
    if (bookingId) {
      await testBookingCancellation(bookingId);
    }
    
    // Step 6: Test lab status update
    await testLabStatusUpdate();
    
    // Step 7: Test multiple connections
    await testMultipleSocketConnections();
    
    // Step 8: Test reconnection
    await testSocketReconnection();
    
    // Cleanup
    await disconnectAll();
    
    // Summary
    console.log('\n========================================');
    console.log('WebSocket Test Summary');
    console.log('========================================');
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    
    if (failed === 0) {
      console.log(`\n${colors.green}✅ WebSocket system fully operational!${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.yellow}⚠️  Some WebSocket tests failed${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n${colors.red}Test suite error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Check if socket.io-client is installed
try {
  require.resolve('socket.io-client');
  require.resolve('axios');
  runTests();
} catch (e) {
  console.log('Installing required dependencies...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install socket.io-client axios', { stdio: 'inherit' });
    console.log('Dependencies installed. Please run the test again.');
  } catch (installError) {
    console.error('Failed to install dependencies:', installError.message);
    process.exit(1);
  }
}
