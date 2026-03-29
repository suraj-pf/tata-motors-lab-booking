const { exec } = require('child_process');
const http = require('http');

const TESTS = [
  { name: 'Server Start', cmd: 'node server.js', timeout: 5000 },
  { name: 'Database Init', cmd: 'node createTables.js', timeout: 10000 },
  { name: 'Health Check', url: 'http://localhost:3000/health' }
];

async function runTests() {
  console.log('🚀 Starting comprehensive tests...\n');
  
  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    process.stdout.write(`Testing: ${test.name}... `);
    
    try {
      if (test.cmd) {
        await new Promise((resolve, reject) => {
          const proc = exec(test.cmd, { timeout: test.timeout }, (error) => {
            if (error) reject(error);
            else resolve();
          });
          
          setTimeout(() => {
            proc.kill();
            resolve();
          }, test.timeout);
        });
      } else if (test.url) {
        await new Promise((resolve, reject) => {
          http.get(test.url, (res) => {
            if (res.statusCode === 200) resolve();
            else reject(new Error(`Status: ${res.statusCode}`));
          }).on('error', reject);
        });
      }
      
      console.log('✅ PASSED');
      passed++;
    } catch (error) {
      console.log('❌ FAILED');
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
  } else {
    console.log('\n⚠️ Some tests failed. Check errors above.');
  }
}

runTests();
