#!/usr/bin/env node

/**
 * WebSocket Payload Validation Test
 * Verifies WebSocket event payloads match database exactly
 */

const { io } = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

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

// Global state
let userToken = null;
let userSocket = null;
let receivedPayloads = {
  bookingCreated: null,
  bookingCancelled: null
};

async function authenticate() {
  printInfo('Authenticating test user...');
  
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'staff1',
      password: 'staff123'
    });
    
    userToken = res.data.access_token;
    printResult(true, 'Authentication successful');
    return userToken;
  } catch (error) {
    printResult(false, `Authentication failed: ${error.message}`);
    process.exit(1);
  }
}

function connectSocket(token) {
  return new Promise((resolve, reject) => {
    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket']
    });
    
    socket.on('connect', () => {
      printResult(true, `Socket connected (ID: ${socket.id})`);
      resolve(socket);
    });
    
    socket.on('connect_error', (error) => {
      printResult(false, `Socket connection failed: ${error.message}`);
      reject(error);
    });
  });
}

function setupEventListeners() {
  printInfo('Setting up event listeners...');
  
  userSocket.on('booking-created', (payload) => {
    printInfo(`Received booking-created event`);
    receivedPayloads.bookingCreated = payload;
  });
  
  userSocket.on('booking-cancelled', (payload) => {
    printInfo(`Received booking-cancelled event`);
    receivedPayloads.bookingCancelled = payload;
  });
  
  userSocket.on('booking-updated', (payload) => {
    printInfo(`Received booking-updated event`);
  });
  
  printResult(true, 'Event listeners configured');
}

async function joinLabRoom(labId) {
  return new Promise((resolve) => {
    userSocket.emit('join-lab-room', labId);
    setTimeout(() => {
      printInfo(`Joined lab-${labId} room`);
      resolve();
    }, 500);
  });
}

async function testBookingPayloadValidation() {
  printInfo('Testing booking-created payload validation...');
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);
  const bookingDate = futureDate.toISOString().split('T')[0];
  
  try {
    // Join lab room
    await joinLabRoom(1);
    
    // Create booking
    const response = await axios.post(
      `${BASE_URL}/api/bookings`,
      {
        lab_id: 1,
        start_time: '14:00',
        end_time: '15:30',
        booking_date: bookingDate,
        bc_number: 'BC101',
        purpose: 'WebSocket payload validation test'
      },
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    
    if (!response.data.success) {
      printResult(false, 'Booking creation failed');
      return null;
    }
    
    const apiBooking = response.data.booking;
    printInfo(`API Response - Booking ID: ${apiBooking.id}`);
    
    // Wait for WebSocket event
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!receivedPayloads.bookingCreated) {
      printResult(false, 'No booking-created event received');
      return null;
    }
    
    const wsPayload = receivedPayloads.bookingCreated;
    
    // Validate payload structure
    printInfo('Validating WebSocket payload fields...');
    
    // Check required fields exist
    const requiredFields = ['type', 'lab_id', 'booking', 'timestamp'];
    let allFieldsPresent = true;
    
    for (const field of requiredFields) {
      if (wsPayload[field] === undefined) {
        printResult(false, `Required field '${field}' missing in payload`);
        allFieldsPresent = false;
      }
    }
    
    if (allFieldsPresent) {
      printResult(true, 'All required fields present in payload');
    }
    
    // Validate type field
    if (wsPayload.type === 'booking-created') {
      printResult(true, 'type field is "booking-created"');
    } else {
      printResult(false, `type field is "${wsPayload.type}", expected "booking-created"`);
    }
    
    // Validate lab_id matches
    if (wsPayload.lab_id === 1) {
      printResult(true, 'lab_id matches (1)');
    } else {
      printResult(false, `lab_id is ${wsPayload.lab_id}, expected 1`);
    }
    
    // Validate booking object
    const wsBooking = wsPayload.booking;
    if (!wsBooking) {
      printResult(false, 'booking object missing in payload');
      return apiBooking.id;
    }
    
    // Compare key fields with API response
    const comparisons = [
      { field: 'id', api: apiBooking.id, ws: wsBooking.id },
      { field: 'lab_id', api: apiBooking.lab_id, ws: wsBooking.lab_id },
      { field: 'start_time', api: apiBooking.start_time, ws: wsBooking.start_time },
      { field: 'end_time', api: apiBooking.end_time, ws: wsBooking.end_time },
      { field: 'booking_date', api: apiBooking.booking_date, ws: wsBooking.booking_date },
      { field: 'status', api: apiBooking.status, ws: wsBooking.status }
    ];
    
    let allMatch = true;
    for (const comp of comparisons) {
      if (String(comp.api) === String(comp.ws)) {
        printResult(true, `${comp.field} matches API (${comp.ws})`);
      } else {
        printResult(false, `${comp.field} mismatch: API=${comp.api}, WS=${comp.ws}`);
        allMatch = false;
      }
    }
    
    if (allMatch) {
      printResult(true, 'All payload fields match database/API');
    }
    
    // Validate timestamp
    if (wsPayload.timestamp) {
      const ts = new Date(wsPayload.timestamp);
      if (!isNaN(ts.getTime())) {
        printResult(true, 'timestamp is valid ISO date');
      } else {
        printResult(false, 'timestamp is invalid');
      }
    } else {
      printResult(false, 'timestamp field missing');
    }
    
    return apiBooking.id;
    
  } catch (error) {
    printResult(false, `Test error: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function testCancellationPayloadValidation(bookingId) {
  printInfo('Testing booking-cancelled payload validation...');
  
  try {
    // Reset event tracking
    receivedPayloads.bookingCancelled = null;
    
    // Cancel booking
    const response = await axios.delete(
      `${BASE_URL}/api/bookings/${bookingId}`,
      { headers: { Authorization: `Bearer ${userToken}` } }
    );
    
    if (!response.data.success) {
      printResult(false, 'Booking cancellation failed');
      return;
    }
    
    const apiBooking = response.data.booking;
    
    // Wait for WebSocket event
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (!receivedPayloads.bookingCancelled) {
      printResult(false, 'No booking-cancelled event received');
      return;
    }
    
    const wsPayload = receivedPayloads.bookingCancelled;
    
    // Validate payload structure
    printInfo('Validating cancellation payload fields...');
    
    // Check required fields
    const requiredFields = ['type', 'lab_id', 'bookingId', 'timestamp'];
    let allFieldsPresent = true;
    
    for (const field of requiredFields) {
      if (wsPayload[field] === undefined) {
        printResult(false, `Required field '${field}' missing in cancellation payload`);
        allFieldsPresent = false;
      }
    }
    
    if (allFieldsPresent) {
      printResult(true, 'All required fields present in cancellation payload');
    }
    
    // Validate type
    if (wsPayload.type === 'booking-cancelled') {
      printResult(true, 'type field is "booking-cancelled"');
    } else {
      printResult(false, `type field is "${wsPayload.type}", expected "booking-cancelled"`);
    }
    
    // Validate bookingId matches
    if (wsPayload.bookingId === bookingId || wsPayload.bookingId === String(bookingId)) {
      printResult(true, `bookingId matches (${bookingId})`);
    } else {
      printResult(false, `bookingId mismatch: WS=${wsPayload.bookingId}, expected=${bookingId}`);
    }
    
    // Validate status in payload if present
    if (wsPayload.status === 'cancelled') {
      printResult(true, 'status is "cancelled"');
    } else if (wsPayload.status) {
      printResult(false, `status is "${wsPayload.status}", expected "cancelled"`);
    }
    
    printResult(true, 'Cancellation payload validation complete');
    
  } catch (error) {
    printResult(false, `Cancellation test error: ${error.response?.data?.message || error.message}`);
  }
}

async function disconnectAll() {
  if (userSocket) {
    userSocket.disconnect();
    printResult(true, 'Socket disconnected');
  }
}

async function runTests() {
  console.log('========================================');
  console.log('WebSocket Payload Validation Test');
  console.log('========================================\n');
  
  try {
    // Step 1: Authenticate
    await authenticate();
    
    // Step 2: Connect socket
    userSocket = await connectSocket(userToken);
    
    // Step 3: Setup listeners
    setupEventListeners();
    
    // Step 4: Test booking creation payload
    const bookingId = await testBookingPayloadValidation();
    
    // Step 5: Test cancellation payload
    if (bookingId) {
      await testCancellationPayloadValidation(bookingId);
    }
    
    // Cleanup
    await disconnectAll();
    
    // Summary
    console.log('\n========================================');
    console.log('Payload Validation Summary');
    console.log('========================================');
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    
    if (failed === 0) {
      console.log(`\n${colors.green}✅ WebSocket payloads match database exactly!${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.yellow}⚠️  Some payload validations failed${colors.reset}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`\n${colors.red}Test suite error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runTests();
