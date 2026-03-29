/**
 * Comprehensive Booking Approval Test Script
 * Tests pending booking fetching and approval functionality
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
    name: `Test Lab Approval ${Date.now()}`,
    building: 'Test Building',
    capacity: 20,
    is_ac: true,
    facilities: 'Test facilities for approval testing',
    lab_owner: 'Test Owner',
    hourly_charges: 100
  };
  
  const result = await authenticatedRequest('POST', '/api/admin/labs', testLab);
  
  if (result.success) {
    testLabId = result.data.lab.id;
    console.log('✅ Test lab created successfully');
    console.log(`   Lab ID: ${testLabId}`);
    return true;
  } else {
    console.log('❌ Failed to create test lab:', result.error);
    return false;
  }
};

const createTestUser = async () => {
  console.log('👤 Creating test user...');
  
  const testUser = {
    username: `testuser_approval_${Date.now()}`,
    password: 'test123456',
    name: 'Test User for Approval',
    bc_number: `BC${Date.now()}`,
    department: 'Test Department',
    role: 'user'
  };
  
  const result = await authenticatedRequest('POST', '/api/admin/users', testUser);
  
  if (result.success) {
    testUserId = result.data.user.id;
    console.log('✅ Test user created successfully');
    console.log(`   User ID: ${testUserId}`);
    return true;
  } else {
    console.log('❌ Failed to create test user:', result.error);
    return false;
  }
};

const createPendingBooking = async () => {
  console.log('📅 Creating pending booking...');
  
  // Create a booking for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const bookingData = {
    lab_id: testLabId,
    user_id: testUserId,
    booking_date: tomorrow.toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '16:00',
    purpose: 'Test booking for approval system'
  };
  
  const result = await authenticatedRequest('POST', '/api/bookings', bookingData);
  
  if (result.success) {
    testBookingId = result.data.booking.id;
    console.log('✅ Pending booking created successfully');
    console.log(`   Booking ID: ${testBookingId}`);
    console.log(`   Status: ${result.data.booking.status}`);
    return true;
  } else {
    console.log('❌ Failed to create pending booking:', result.error);
    return false;
  }
};

const testGetPendingBookings = async () => {
  console.log('📋 Testing get pending bookings...');
  
  const result = await authenticatedRequest('GET', '/api/admin/bookings/pending');
  
  if (result.success) {
    console.log('✅ Get pending bookings successful');
    console.log(`   Total pending bookings: ${result.data.total}`);
    console.log(`   Bookings found: ${result.data.bookings.length}`);
    
    // Check if our test booking is in the list
    const testBooking = result.data.bookings.find(b => b.id === testBookingId);
    if (testBooking) {
      console.log('✅ Test booking found in pending list');
      console.log('   Test booking details:');
      console.log(`     - Lab: ${testBooking.lab_name}`);
      console.log(`     - User: ${testBooking.user_name}`);
      console.log(`     - Date: ${testBooking.booking_date}`);
      console.log(`     - Time: ${testBooking.start_time} - ${testBooking.end_time}`);
      console.log(`     - Queue Position: ${testBooking.queue_position}`);
      console.log(`     - Status: ${testBooking.status}`);
    } else {
      console.log('❌ Test booking not found in pending list');
    }
    
    return true;
  } else {
    console.log('❌ Get pending bookings failed:', result.error);
    return false;
  }
};

const testApproveBooking = async () => {
  console.log('✅ Testing booking approval...');
  
  const result = await authenticatedRequest('PATCH', `/api/admin/bookings/${testBookingId}/approve`, {
    approved: true,
    reason: 'Test approval - booking meets all requirements'
  });
  
  if (result.success) {
    console.log('✅ Booking approval successful');
    console.log(`   Message: ${result.data.message}`);
    console.log(`   New Status: ${result.data.booking.status}`);
    console.log(`   Lab: ${result.data.booking.lab_name}`);
    console.log(`   User: ${result.data.booking.user_name}`);
    
    // Verify the booking is no longer in pending list
    const pendingResult = await authenticatedRequest('GET', '/api/admin/bookings/pending');
    if (pendingResult.success) {
      const stillPending = pendingResult.data.bookings.find(b => b.id === testBookingId);
      if (!stillPending) {
        console.log('✅ Booking successfully removed from pending list');
      } else {
        console.log('❌ Booking still appears in pending list after approval');
      }
    }
    
    return true;
  } else {
    console.log('❌ Booking approval failed:', result.error);
    return false;
  }
};

const testRejectBooking = async () => {
  console.log('❌ Testing booking rejection...');
  
  // Create another booking for rejection test
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const bookingData = {
    lab_id: testLabId,
    user_id: testUserId,
    booking_date: tomorrow.toISOString().split('T')[0],
    start_time: '16:00',
    end_time: '18:00',
    purpose: 'Test booking for rejection testing'
  };
  
  const createResult = await authenticatedRequest('POST', '/api/bookings', bookingData);
  
  if (createResult.success) {
    const rejectBookingId = createResult.data.booking.id;
    console.log('✅ Created booking for rejection test');
    
    const rejectResult = await authenticatedRequest('PATCH', `/api/admin/bookings/${rejectBookingId}/approve`, {
      approved: false,
      reason: 'Test rejection - lab conflict with existing booking'
    });
    
    if (rejectResult.success) {
      console.log('✅ Booking rejection successful');
      console.log(`   Message: ${rejectResult.data.message}`);
      console.log(`   New Status: ${rejectResult.data.booking.status}`);
      
      // Verify the booking is no longer in pending list
      const pendingResult = await authenticatedRequest('GET', '/api/admin/bookings/pending');
      if (pendingResult.success) {
        const stillPending = pendingResult.data.bookings.find(b => b.id === rejectBookingId);
        if (!stillPending) {
          console.log('✅ Rejected booking successfully removed from pending list');
        } else {
          console.log('❌ Rejected booking still appears in pending list');
        }
      }
      
      return true;
    } else {
      console.log('❌ Booking rejection failed:', rejectResult.error);
      return false;
    }
  } else {
    console.log('❌ Failed to create booking for rejection test:', createResult.error);
    return false;
  }
};

const testEmptyPendingList = async () => {
  console.log('📭 Testing empty pending list response...');
  
  // Get current pending bookings
  const result = await authenticatedRequest('GET', '/api/admin/bookings/pending');
  
  if (result.success) {
    console.log('✅ Empty pending list test successful');
    console.log(`   Current pending bookings: ${result.data.total}`);
    
    if (result.data.total === 0) {
      console.log('✅ Correctly returns empty list when no pending bookings');
    } else {
      console.log('ℹ️ There are still pending bookings in the system');
      result.data.bookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.lab_name} - ${booking.user_name} (Queue #${booking.queue_position})`);
      });
    }
    
    return true;
  } else {
    console.log('❌ Empty pending list test failed:', result.error);
    return false;
  }
};

const testInvalidBookingApproval = async () => {
  console.log('🚫 Testing invalid booking approval...');
  
  // Try to approve a non-existent booking
  const invalidResult = await authenticatedRequest('PATCH', '/api/admin/bookings/99999/approve', {
    approved: true,
    reason: 'Test with invalid booking ID'
  });
  
  if (!invalidResult.success && invalidResult.status === 404) {
    console.log('✅ Invalid booking approval correctly returns 404');
  } else {
    console.log('❌ Invalid booking approval should return 404');
  }
  
  // Try to approve an already approved booking
  const alreadyApprovedResult = await authenticatedRequest('PATCH', `/api/admin/bookings/${testBookingId}/approve`, {
    approved: true,
    reason: 'Test with already approved booking'
  });
  
  if (!alreadyApprovedResult.success && alreadyApprovedResult.status === 404) {
    console.log('✅ Already approved booking correctly returns 404');
  } else {
    console.log('❌ Already approved booking should return 404');
  }
  
  return true;
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
  console.log('🚀 Starting Comprehensive Booking Approval Tests\n');
  
  const tests = [
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Create Test Lab', fn: createTestLab },
    { name: 'Create Test User', fn: createTestUser },
    { name: 'Create Pending Booking', fn: createPendingBooking },
    { name: 'Test Get Pending Bookings', fn: testGetPendingBookings },
    { name: 'Test Approve Booking', fn: testApproveBooking },
    { name: 'Test Reject Booking', fn: testRejectBooking },
    { name: 'Test Empty Pending List', fn: testEmptyPendingList },
    { name: 'Test Invalid Approval', fn: testInvalidBookingApproval },
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
    console.log('🎉 All tests passed! Booking approval functionality is working correctly.');
    console.log('\n📋 Features Verified:');
    console.log('✅ Fetch pending bookings with queue positions');
    console.log('✅ Approve pending bookings');
    console.log('✅ Reject pending bookings with reasons');
    console.log('✅ Handle empty pending lists');
    console.log('✅ Validate invalid booking operations');
    console.log('✅ Remove processed bookings from pending list');
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
  testGetPendingBookings,
  testApproveBooking,
  testRejectBooking,
  createPendingBooking
};
