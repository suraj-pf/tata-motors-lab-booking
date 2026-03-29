const http = require('http');

const ENDPOINTS = [
  { name: 'Health', url: '/health', auth: false },
  { name: 'Labs', url: '/api/labs', auth: false },
  { name: 'Bookings', url: '/api/bookings', auth: true },
  { name: 'Admin Users', url: '/api/admin/users', auth: true, admin: true }
];

const ITERATIONS = 10;
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJzdGFmZjEiLCJyb2xlIjoidXNlciIsImlhdCI6MTc3MjI3MjA0OSwiZXhwIjoxNzcyMjcyOTQ5fQ.HjBAeBZ5r96EC379AYTsmEsx-DZiJDgUfTV25iLWot8';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3MjI3MjA1OCwiZXhwIjoxNzcyMjcyOTU4fQ.bmJFRgrp1TQfUtWqlZ2DjC0ragm50o3lZVPvN1V3UOQ';

async function testEndpoint(name, url, requiresAuth, requiresAdmin) {
  const times = [];
  
  for (let i = 0; i < ITERATIONS; i++) {
    const start = Date.now();
    
    try {
      await new Promise((resolve, reject) => {
        const options = {
          hostname: 'localhost',
          port: 3000,
          path: url,
          headers: {}
        };
        
        if (requiresAuth) {
          options.headers['Authorization'] = `Bearer ${requiresAdmin ? ADMIN_TOKEN : TOKEN}`;
        }
        
        const req = http.get(options, (res) => {
          const end = Date.now();
          times.push(end - start);
          resolve();
        });
        
        req.on('error', () => {
          const end = Date.now();
          times.push(end - start);
          resolve();
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          const end = Date.now();
          times.push(end - start);
          resolve();
        });
        
        req.end();
      });
    } catch (error) {
      const end = Date.now();
      times.push(end - start);
    }
  }
  
  // Filter out invalid times
  const validTimes = times.filter(t => !isNaN(t) && isFinite(t) && t > 0);
  
  if (validTimes.length === 0) {
    console.log(`${name}:`);
    console.log(`  Status: ❌ Failed to get valid measurements`);
    return;
  }
  
  const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
  const min = Math.min(...validTimes);
  const max = Math.max(...validTimes);
  
  console.log(`${name}:`);
  console.log(`  Avg: ${avg.toFixed(2)}ms`);
  console.log(`  Min: ${min}ms`);
  console.log(`  Max: ${max}ms`);
  console.log(`  Status: ${avg < 500 ? '✅' : '⚠️'}`);
}

async function runPerformanceTests() {
  console.log('🚀 Running performance tests...\n');
  
  for (const endpoint of ENDPOINTS) {
    await testEndpoint(endpoint.name, endpoint.url, endpoint.auth, endpoint.admin);
  }
}

runPerformanceTests();
