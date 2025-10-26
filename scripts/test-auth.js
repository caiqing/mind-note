const fetch = require('node-fetch');

async function testAuthAPI() {
  const baseUrl = 'http://localhost:3000';

  console.log('🔍 Testing Authentication API...');

  try {
    // Test if NextAuth endpoint is accessible
    console.log('📍 Testing NextAuth endpoint...');
    const response = await fetch(`${baseUrl}/api/auth/session`);

    if (response.ok) {
      const session = await response.json();
      console.log('✅ NextAuth endpoint working:', session);
    } else {
      console.log('❌ NextAuth endpoint failed:', response.status);
    }

    // Test health check endpoint
    console.log('📍 Testing health check...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);

    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Health check working:', health);
    } else {
      console.log('❌ Health check failed:', healthResponse.status);
    }
  } catch (error) {
    console.error('❌ Auth API test failed:', error.message);
  }
}

testAuthAPI();
