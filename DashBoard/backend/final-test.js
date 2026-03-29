const { spawn } = require('child_process');
const http = require('http');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

let server;
let staffToken;
let adminToken;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startServer() {
  console.log('🚀 Starting server...');
  server = spawn('node', ['server.js'], { 
    cwd: process.cwd(),
    stdio: 'pipe'
  });
  
  server.stdout.on('data', (data) => {
    console.log(`📡 Server: ${data}`);
  });
  
  server.stderr.on('data', (data) => {
    console.error(`❌ Server error: ${data}`);
  });
  
  await sleep(3000);
  console.log('✅ Server started\n');
}

async function stopServer() {
  if (server) {
    server.kill();
    await sleep(1000);
    console.log('🛑 Server stopped\n');
  }
}

async function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testHealth() {
  console.log('1️⃣ Testing Health Check...');
  const res = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/health',
    method: 'GET'
  });
  
  console.log(`   Status: ${res.status === 200 ? '✅' : '❌'} ${res.status}`);
  if (res.body) {
    console.log(`   Response:`, res.body);
  }
  console.log();
  return res.status === 200;
}

async function testLabs() {
  console.log('2️⃣ Testing Labs API...');
  const res = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/labs',
    method: 'GET'
  });
  
  console.log(`   Status: ${res.status === 200 ? '✅' : '❌'} ${res.status}`);
  if (res.body && res.body.labs) {
    console.log(`   Labs found: ${res.body.labs.length}`);
  }
  console.log();
  return res.status === 200;
}

async function testStaffLogin() {
  console.log('3️⃣ Testing Staff Login...');
  const res = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'staff1', password: 'user123' });
  
  console.log(`   Status: ${res.status === 200 ? '✅' : '❌'} ${res.status}`);
  if (res.body && res.body.access_token) {
    staffToken = res.body.access_token;
    console.log(`   Token received: ✅`);
    console.log(`   User: ${res.body.user.name}`);
  }
  console.log();
  return res.status === 200 && staffToken;
}

async function testAdminLogin() {
  console.log('4️⃣ Testing Admin Login...');
  const res = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'admin123' });
  
  console.log(`   Status: ${res.status === 200 ? '✅' : '❌'} ${res.status}`);
  if (res.body && res.body.access_token) {
    adminToken = res.body.access_token;
    console.log(`   Token received: ✅`);
    console.log(`   User: ${res.body.user.name}`);
  }
  console.log();
  return res.status === 200 && adminToken;
}

async function testStaffBookings() {
  console.log('5️⃣ Testing Staff Bookings...');
  const res = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/bookings',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  });
  
  console.log(`   Status: ${res.status === 200 ? '✅' : '❌'} ${res.status}`);
  if (res.body && res.body.bookings) {
    console.log(`   Bookings found: ${res.body.bookings.length}`);
    if (res.body.pagination) {
      console.log(`   Pagination:`, res.body.pagination);
    }
  }
  console.log();
  return res.status === 200;
}

async function testAdminUsers() {
  console.log('6️⃣ Testing Admin Users...');
  const res = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  console.log(`   Status: ${res.status === 200 ? '✅' : '❌'} ${res.status}`);
  if (res.body && res.body.users) {
    console.log(`   Users found: ${res.body.users.length}`);
  }
  console.log();
  return res.status === 200;
}

async function testAdminBookings() {
  console.log('7️⃣ Testing Admin Bookings...');
  const res = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/bookings',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  console.log(`   Status: ${res.status === 200 ? '✅' : '❌'} ${res.status}`);
  if (res.body && res.body.bookings) {
    console.log(`   All bookings: ${res.body.bookings.length}`);
  }
  console.log();
  return res.status === 200;
}

async function testAdminAnalytics() {
  console.log('8️⃣ Testing Admin Analytics...');
  const res = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/analytics',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  console.log(`   Status: ${res.status === 200 ? '✅' : '❌'} ${res.status}`);
  if (res.body && res.body.summary) {
    console.log(`   Summary:`, res.body.summary);
  }
  console.log();
  return res.status === 200;
}

async function testWebSocket() {
  console.log('9️⃣ Testing WebSocket...');
  
  return new Promise((resolve) => {
    const socket = io(BASE_URL, {
      transports: ['websocket'],
      timeout: 5000
    });
    
    let connected = false;
    
    socket.on('connect', () => {
      console.log(`   Connected: ✅ (ID: ${socket.id})`);
      connected = true;
      socket.disconnect();
    });
    
    socket.on('disconnect', () => {
      if (connected) {
        console.log(`   Disconnected: ✅`);
      }
      resolve(connected);
    });
    
    socket.on('connect_error', (err) => {
      console.log(`   Connection: ❌ ${err.message}`);
      resolve(false);
    });
    
    setTimeout(() => {
      if (!connected) {
        console.log(`   Connection: ❌ Timeout`);
        socket.disconnect();
        resolve(false);
      }
    }, 5000);
  });
}

async function testUnauthorizedAccess() {
  console.log('🔟 Testing Unauthorized Access...');
  
  // Try accessing admin with staff token
  const res1 = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/admin/users',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${staffToken}` }
  });
  
  console.log(`   Staff accessing admin: ${res1.status === 403 ? '✅' : '❌'} (Expected 403, got ${res1.status})`);
  
  // Try accessing bookings with invalid token
  const res2 = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/bookings',
    method: 'GET',
    headers: { 'Authorization': 'Bearer invalid.token.here' }
  });
  
  console.log(`   Invalid token: ${res2.status === 401 ? '✅' : '❌'} (Expected 401, got ${res2.status})`);
  
  // Try accessing without token
  const res3 = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/bookings',
    method: 'GET'
  });
  
  console.log(`   No token: ${res3.status === 401 ? '✅' : '❌'} (Expected 401, got ${res3.status})`);
  
  console.log();
  return res1.status === 403 && res2.status === 401 && res3.status === 401;
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🔬 COMPREHENSIVE BACKEND TEST SUITE');
  console.log('='.repeat(60) + '\n');
  
  let passed = 0;
  let total = 10;
  
  try {
    await startServer();
    
    if (await testHealth()) passed++;
    if (await testLabs()) passed++;
    if (await testStaffLogin()) passed++;
    if (await testAdminLogin()) passed++;
    if (await testStaffBookings()) passed++;
    if (await testAdminUsers()) passed++;
    if (await testAdminBookings()) passed++;
    if (await testAdminAnalytics()) passed++;
    if (await testWebSocket()) passed++;
    if (await testUnauthorizedAccess()) passed++;
    
    await stopServer();
    
    console.log('='.repeat(60));
    console.log(`📊 FINAL RESULTS: ${passed}/${total} tests passed`);
    console.log('='.repeat(60));
    
    if (passed === total) {
      console.log('\n🎉✅🎉 ALL TESTS PASSED! BACKEND IS PRODUCTION READY! 🎉✅🎉');
    } else {
      console.log('\n⚠️ Some tests failed. Review output above.');
    }
    
  } catch (error) {
    console.error('❌ Test suite error:', error);
    await stopServer();
  }
}

runAllTests();
