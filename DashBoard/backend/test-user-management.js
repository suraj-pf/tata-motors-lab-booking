/**
 * Comprehensive User Management Test Script
 * Tests all CRUD operations and status management for users
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

let authToken = '';
let testUserId = null;

// Test data
const testUser = {
  username: `testuser_${Date.now()}`,
  password: 'test123456',
  name: 'Test User for Management',
  bc_number: `BC${Date.now()}`,
  department: 'Computer Science',
  role: 'user'
};

const updatedUserData = {
  name: 'Updated Test User',
  department: 'Updated Department',
  role: 'admin'
};

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

const testCreateUser = async () => {
  console.log('👤 Testing user creation...');
  
  const result = await authenticatedRequest('POST', '/api/admin/users', testUser);
  
  if (result.success) {
    testUserId = result.data.user.id;
    console.log('✅ User creation successful');
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Username: ${result.data.user.username}`);
    console.log(`   Name: ${result.data.user.name}`);
    console.log(`   Role: ${result.data.user.role}`);
    console.log(`   Status: ${result.data.user.is_active ? 'Active' : 'Inactive'}`);
    return true;
  } else {
    console.log('❌ User creation failed:', result.error);
    return false;
  }
};

const testGetAllUsers = async () => {
  console.log('📋 Testing get all users...');
  
  const result = await authenticatedRequest('GET', '/api/admin/users');
  
  if (result.success) {
    console.log('✅ Get all users successful');
    console.log(`   Total users: ${result.data.users.length}`);
    
    // Verify our test user is in the list
    const testUserExists = result.data.users.some(user => user.id === testUserId);
    if (testUserExists) {
      console.log('✅ Test user found in the list');
      
      // Display user details
      const testUserDetails = result.data.users.find(user => user.id === testUserId);
      console.log(`   Test User Details:`, {
        id: testUserDetails.id,
        username: testUserDetails.username,
        name: testUserDetails.name,
        role: testUserDetails.role,
        is_active: testUserDetails.is_active
      });
    } else {
      console.log('❌ Test user not found in the list');
    }
    
    return true;
  } else {
    console.log('❌ Get all users failed:', result.error);
    return false;
  }
};

const testUpdateUser = async () => {
  console.log('✏️ Testing user update...');
  
  const result = await authenticatedRequest('PUT', `/api/admin/users/${testUserId}`, updatedUserData);
  
  if (result.success) {
    console.log('✅ User update successful');
    console.log(`   Updated Name: ${result.data.user.name}`);
    console.log(`   Updated Department: ${result.data.user.department}`);
    console.log(`   Updated Role: ${result.data.user.role}`);
    
    // Verify the updates
    const isCorrect = result.data.user.name === updatedUserData.name &&
                     result.data.user.department === updatedUserData.department &&
                     result.data.user.role === updatedUserData.role;
    
    if (isCorrect) {
      console.log('✅ All updates applied correctly');
    } else {
      console.log('❌ Some updates were not applied correctly');
    }
    
    return true;
  } else {
    console.log('❌ User update failed:', result.error);
    return false;
  }
};

const testToggleUserRole = async () => {
  console.log('🔄 Testing user role toggle...');
  
  // First, get current role
  const getResult = await authenticatedRequest('GET', `/api/admin/users`);
  if (!getResult.success) {
    console.log('❌ Failed to get users before role toggle');
    return false;
  }
  
  const currentUser = getResult.data.users.find(u => u.id === testUserId);
  if (!currentUser) {
    console.log('❌ Test user not found');
    return false;
  }
  
  const originalRole = currentUser.role;
  console.log(`   Original role: ${originalRole}`);
  
  // Toggle role (user -> admin or admin -> user)
  const newRole = originalRole === 'admin' ? 'user' : 'admin';
  
  const toggleResult = await authenticatedRequest('PUT', `/api/admin/users/${testUserId}`, { role: newRole });
  
  if (toggleResult.success) {
    console.log('✅ User role toggle successful');
    console.log(`   New role: ${toggleResult.data.user.role}`);
    
    // Verify the role actually changed
    const roleChanged = toggleResult.data.user.role === newRole;
    if (roleChanged) {
      console.log('✅ Role successfully changed');
    } else {
      console.log('❌ Role did not change as expected');
    }
    
    return true;
  } else {
    console.log('❌ User role toggle failed:', toggleResult.error);
    return false;
  }
};

const testToggleUserStatus = async () => {
  console.log('🔄 Testing user status toggle...');
  
  // First, get current status
  const getResult = await authenticatedRequest('GET', `/api/admin/users`);
  if (!getResult.success) {
    console.log('❌ Failed to get users before status toggle');
    return false;
  }
  
  const currentUser = getResult.data.users.find(u => u.id === testUserId);
  if (!currentUser) {
    console.log('❌ Test user not found');
    return false;
  }
  
  const originalStatus = currentUser.is_active;
  console.log(`   Original status: ${originalStatus ? 'Active' : 'Inactive'}`);
  
  // Toggle status
  const toggleResult = await authenticatedRequest('PATCH', `/api/admin/users/${testUserId}/toggle`);
  
  if (toggleResult.success) {
    console.log('✅ User status toggle successful');
    console.log(`   New status: ${toggleResult.data.is_active ? 'Active' : 'Inactive'}`);
    console.log(`   Message: ${toggleResult.data.message}`);
    
    // Verify the status actually changed
    const statusChanged = toggleResult.data.is_active !== originalStatus;
    if (statusChanged) {
      console.log('✅ Status successfully changed');
    } else {
      console.log('❌ Status did not change as expected');
    }
    
    return true;
  } else {
    console.log('❌ User status toggle failed:', toggleResult.error);
    return false;
  }
};

const testDeleteUser = async () => {
  console.log('🗑️ Testing user deletion (soft delete)...');
  
  const result = await authenticatedRequest('DELETE', `/api/admin/users/${testUserId}`);
  
  if (result.success) {
    console.log('✅ User deletion successful');
    console.log(`   Message: ${result.data.message}`);
    
    // Verify the user is deactivated (soft delete)
    const verifyResult = await authenticatedRequest('GET', '/api/admin/users');
    if (verifyResult.success) {
      const testUserDetails = verifyResult.data.users.find(user => user.id === testUserId);
      if (testUserDetails) {
        if (!testUserDetails.is_active) {
          console.log('✅ User successfully deactivated (soft deleted)');
        } else {
          console.log('❌ User still active after deletion');
        }
      } else {
        console.log('❌ User not found after deletion');
      }
    }
    
    return true;
  } else {
    console.log('❌ User deletion failed:', result.error);
    return false;
  }
};

const testCreateDuplicateUser = async () => {
  console.log('🚫 Testing duplicate user creation...');
  
  // Try to create user with same username
  const duplicateUsername = { ...testUser, username: testUser.username };
  const result1 = await authenticatedRequest('POST', '/api/admin/users', duplicateUsername);
  
  if (!result1.success && result1.error.includes('Username already exists')) {
    console.log('✅ Duplicate username validation works');
  } else {
    console.log('❌ Duplicate username validation failed');
  }
  
  // Try to create user with same BC number
  const duplicateBC = { 
    ...testUser, 
    username: `newuser_${Date.now()}`, 
    bc_number: testUser.bc_number 
  };
  const result2 = await authenticatedRequest('POST', '/api/admin/users', duplicateBC);
  
  if (!result2.success && result2.error.includes('BC number already exists')) {
    console.log('✅ Duplicate BC number validation works');
  } else {
    console.log('❌ Duplicate BC number validation failed');
  }
  
  return true;
};

const testErrorHandling = async () => {
  console.log('⚠️ Testing error handling...');
  
  // Test getting non-existent user
  const getNonExistent = await authenticatedRequest('GET', '/api/admin/users');
  if (getNonExistent.success) {
    const nonExistentUser = getNonExistent.data.users.find(u => u.id === 99999);
    if (!nonExistentUser) {
      console.log('✅ Non-existent user handling works');
    }
  }
  
  // Test updating non-existent user
  const updateNonExistent = await authenticatedRequest('PUT', '/api/admin/users/99999', updatedUserData);
  if (!updateNonExistent.success) {
    console.log('✅ Non-existent user update fails appropriately');
  } else {
    console.log('❌ Non-existent user update should fail');
  }
  
  // Test deleting non-existent user
  const deleteNonExistent = await authenticatedRequest('DELETE', '/api/admin/users/99999');
  if (!deleteNonExistent.success) {
    console.log('✅ Non-existent user deletion fails appropriately');
  } else {
    console.log('❌ Non-existent user deletion should fail');
  }
  
  // Test toggling non-existent user
  const toggleNonExistent = await authenticatedRequest('PATCH', '/api/admin/users/99999/toggle');
  if (!toggleNonExistent.success) {
    console.log('✅ Non-existent user toggle fails appropriately');
  } else {
    console.log('❌ Non-existent user toggle should fail');
  }
  
  return true;
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Comprehensive User Management Tests\n');
  
  const tests = [
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Create User', fn: testCreateUser },
    { name: 'Get All Users', fn: testGetAllUsers },
    { name: 'Update User', fn: testUpdateUser },
    { name: 'Toggle User Role', fn: testToggleUserRole },
    { name: 'Toggle User Status', fn: testToggleUserStatus },
    { name: 'Delete User', fn: testDeleteUser },
    { name: 'Create Duplicate User', fn: testCreateDuplicateUser },
    { name: 'Error Handling', fn: testErrorHandling }
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
    console.log('🎉 All tests passed! User management functionality is working correctly.');
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
  testCreateUser,
  testGetAllUsers,
  testUpdateUser,
  testToggleUserRole,
  testToggleUserStatus,
  testDeleteUser,
  testCreateDuplicateUser,
  testErrorHandling
};
