// Test script to verify tRPC endpoints are working
// Run this with: node scripts/test-trpc-endpoints.js

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(path, method = 'GET', body = null) {
  try {
    console.log(`\n🧪 Testing ${method} ${path}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${path}`, options);
    const text = await response.text();
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    
    // Check if response is HTML (indicates error)
    if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
      console.log('❌ ERROR: Got HTML response instead of JSON');
      return false;
    }
    
    // Try to parse as JSON
    try {
      const json = JSON.parse(text);
      console.log('✅ Valid JSON response');
      return true;
    } catch (e) {
      console.log('❌ ERROR: Invalid JSON response');
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Testing tRPC endpoints...\n');
  
  const tests = [
    // Basic API health check
    { path: '/api/', method: 'GET' },
    
    // tRPC debug endpoint
    { path: '/api/debug', method: 'GET' },
    
    // Test tRPC endpoint
    { path: '/api/test-trpc', method: 'GET' },
    
    // tRPC example endpoint
    { 
      path: '/api/trpc/example.hi', 
      method: 'POST',
      body: {
        "0": {
          "json": { "name": "test" }
        }
      }
    },
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await testEndpoint(test.path, test.method, test.body);
    if (success) passed++;
  }
  
  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All tests passed! tRPC endpoints are working correctly.');
  } else {
    console.log('❌ Some tests failed. Check your server configuration.');
    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure your development server is running on port 3000');
    console.log('2. Check that the API routes are properly configured');
    console.log('3. Verify that the Hono server is mounted correctly');
  }
}

runTests().catch(console.error);