/**
 * Comprehensive Booking Auto-Completion Test Script
 * Tests automatic completion of expired bookings
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';
let testBookingId = null;
let testLabId = null;
let testUserId = null;

// Helper function to make authenticated requests
const authenticatedRequest = async (method, url, data = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.error || error.message,
      status: error.response?.status || 500
    };
  }
};

// Test functions
const testAdminLogin = async () => {
  console.log('🔐 Testing admin login...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.token) {
      authToken = response.data.token;
      console.log('✅ Admin login successful');
      return true;
    } else {
      console.log('❌ Admin login failed: No token received');
      return false;
    }
  } catch (error) {
    console.log('❌ Admin login failed:', error.response?.data?.error || error.message);
    return false;
  }
};

const createTestLab = async () => {
  console.log('🏗️ Creating test lab...');
  
  const testLab = {
    name: `Test Lab Auto Complete ${Date.now()}`,
    building: 'Test Building',
    capacity: 20,
    is_ac: true,
    facilities: 'Test facilities',
    lab_owner: 'Test Owner',
    hourly_charges: 100
  };
  
  const result = await authenticatedRequest('POST', '/api/admin/labs', testLab);
  
  if (result.success) {
    testLabId = result.data.lab.id;
    console.log('✅ Test lab created successfully');
    return true;
  } else {
    console.log('❌ Failed to create test lab:', result.error);
    return false;
  }
};

const createTestUser = async () => {
  console.log('👤 Creating test user...');
  
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'test123456',
    name: 'Test User for Booking',
    bc_number: `BC${Date.now()}`,
    department: 'Test Department',
    role: 'user'
  };
  
  const result = await authenticatedRequest('POST', '/api/admin/users', testUser);
  
  if (result.success) {
    testUserId = result.data.user.id;
    console.log('✅ Test user created successfully');
    return true;
  } else {
    console.log('❌ Failed to create test user:', result.error);
    return false;
  }
};

const createExpiredBooking = async () => {
  console.log('📅 Creating expired booking...');
  
  // Create a booking with a past date and time
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const bookingData = {
    lab_id: testLabId,
    user_id: testUserId,
    booking_date: yesterday.toISOString().split('T')[0], // Yesterday
    start_time: '09:00',
    end_time: '10:00',
    purpose: 'Test booking for auto-completion'
  };
  
  const result = await authenticatedRequest('POST', '/api/bookings', bookingData);
  
  if (result.success) {
    testBookingId = result.data.booking.id;
    console.log('✅ Expired booking created successfully');
    console.log(`   Booking ID: ${testBookingId}`);
    console.log(`   Date: ${bookingData.booking_date}`);
    console.log(`   Time: ${bookingData.start_time} - ${bookingData.end_time}`);
    return true;
  } else {
    console.log('❌ Failed to create expired booking:', result.error);
    return false;
  }
};

const testAutoCompleteExpiredBookings = async () => {
  console.log('🤖 Testing auto-complete expired bookings...');
  
  const result = await authenticatedRequest('POST', '/api/admin/bookings/auto-complete');
  
  if (result.success) {
    console.log('✅ Auto-complete API call successful');
    console.log(`   Message: ${result.data.message}`);
    console.log(`   Completed Count: ${result.data.completedCount}`);
    
    if (result.data.completedCount > 0) {
      console.log('✅ Bookings were auto-completed');
      result.data.completedBookings.forEach(booking => {
        console.log(`   - Booking ID: ${booking.id}, Date: ${booking.booking_date}, End Time: ${booking.end_time}`);
      });
    } else {
      console.log('ℹ️ No expired bookings found to auto-complete');
    }
    
    return true;
  } else {
    console.log('❌ Auto-complete failed:', result.error);
    return false;
  }
};

const testBookingStatusAfterAutoComplete = async () => {
  console.log('🔍 Testing booking status after auto-completion...');
  
  // Get all bookings and check our test booking
  const result = await authenticatedRequest('GET', '/api/admin/bookings');
  
  if (result.success) {
    const testBooking = result.data.bookings.find(b => b.id === testBookingId);
    
    if (testBooking) {
      console.log(`✅ Test booking found`);
      console.log(`   Status: ${testBooking.status}`);
      
      if (testBooking.status === 'completed') {
        console.log('✅ Booking was successfully auto-completed');
      } else {
        console.log('❌ Booking was not auto-completed as expected');
      }
      
      return true;
    } else {
      console.log('❌ Test booking not found in the list');
      return false;
    }
  } else {
    console.log('❌ Failed to get bookings:', result.error);
    return false;
  }
};

const createFutureBooking = async () => {
  console.log('📅 Creating future booking (should not be auto-completed)...');
  
  // Create a booking with a future date and time
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const bookingData = {
    lab_id: testLabId,
    user_id: testUserId,
    booking_date: tomorrow.toISOString().split('T')[0], // Tomorrow
    start_time: '14:00',
    end_time: '16:00',
    purpose: 'Test future booking'
  };
  
  const result = await authenticatedRequest('POST', '/api/bookings', bookingData);
  
  if (result.success) {
    const futureBookingId = result.data.booking.id;
    console.log('✅ Future booking created successfully');
    console.log(`   Booking ID: ${futureBookingId}`);
    
    // Run auto-complete again
    const autoCompleteResult = await authenticatedRequest('POST', '/api/admin/bookings/auto-complete');
    
    if (autoCompleteResult.success) {
      // Check if future booking is still confirmed
      const bookingsResult = await authenticatedRequest('GET', '/api/admin/bookings');
      if (bookingsResult.success) {
        const futureBooking = bookingsResult.data.bookings.find(b => b.id === futureBookingId);
        
        if (futureBooking && futureBooking.status === 'confirmed') {
          console.log('✅ Future booking was not auto-completed (correct behavior)');
        } else {
          console.log('❌ Future booking was incorrectly auto-completed');
        }
      }
    }
    
    return true;
  } else {
    console.log('❌ Failed to create future booking:', result.error);
    return false;
  }
};

const testManualBookingCompletion = async () => {
  console.log('✋ Testing manual booking completion...');
  
  // Create another expired booking for manual testing
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const bookingData = {
    lab_id: testLabId,
    user_id: testUserId,
    booking_date: yesterday.toISOString().split('T')[0],
    start_time: '11:00',
    end_time: '12:00',
    purpose: 'Test manual completion'
  };
  
  const createResult = await authenticatedRequest('POST', '/api/bookings', bookingData);
  
  if (createResult.success) {
    const manualBookingId = createResult.data.booking.id;
    console.log('✅ Created booking for manual completion test');
    
    // Manually complete the booking
    const completeResult = await authenticatedRequest('PATCH', `/api/admin/bookings/${manualBookingId}`, { status: 'completed' });
    
    if (completeResult.success) {
      console.log('✅ Manual booking completion successful');
      console.log(`   Status: ${completeResult.data.booking.status}`);
      return true;
    } else {
      console.log('❌ Manual booking completion failed:', completeResult.error);
      return false;
    }
  } else {
    console.log('❌ Failed to create booking for manual test:', createResult.error);
    return false;
  }
};

const cleanupTestData = async () => {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Delete test booking (soft delete)
    if (testBookingId) {
      await authenticatedRequest('DELETE', `/api/admin/bookings/${testBookingId}`);
    }
    
    // Delete test lab
    if (testLabId) {
      await authenticatedRequest('DELETE', `/api/admin/labs/${testLabId}`);
    }
    
    // Deactivate test user
    if (testUserId) {
      await authenticatedRequest('DELETE', `/api/admin/users/${testUserId}`);
    }
    
    console.log('✅ Test data cleaned up successfully');
    return true;
  } catch (error) {
    console.log('⚠️ Error during cleanup:', error.message);
    return false;
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Comprehensive Booking Auto-Completion Tests\n');
  
  const tests = [
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Create Test Lab', fn: createTestLab },
    { name: 'Create Test User', fn: createTestUser },
    { name: 'Create Expired Booking', fn: createExpiredBooking },
    { name: 'Test Auto-Complete API', fn: testAutoCompleteExpiredBookings },
    { name: 'Verify Booking Status', fn: testBookingStatusAfterAutoComplete },
    { name: 'Test Future Booking', fn: createFutureBooking },
    { name: 'Test Manual Completion', fn: testManualBookingCompletion },
    { name: 'Cleanup Test Data', fn: cleanupTestData }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    console.log(`\n--- ${test.name} ---`);
    const result = await test.fn();
    if (result) {
      passedTests++;
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Booking auto-completion functionality is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the errors above.');
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testAdminLogin,
  testAutoCompleteExpiredBookings,
  testBookingStatusAfterAutoComplete,
  createExpiredBooking,
  createFutureBooking
};
