const https = require('https');

// Test the fixed health API endpoint
const testData = {
  device_id: "TEST-DEVICE-002",
  license_key: "ADMIN-UNLIMITED-749fdd88-cbcc-414b-b679-0b313af45c25",
  timestamp: new Date().toISOString(),
  system_info: {
    hostname: "test-device-2",
    os_name: "Windows",
    os_version: "10.0.26100"
  },
  performance_metrics: {
    cpu_usage_percent: 30.5,
    memory_usage_percent: 55.2
  }
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'gridhealth.arwindpianist.store',
  port: 443,
  path: '/api/health',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'X-License-Key': testData.license_key
  }
};

console.log('🚀 Testing fixed health API endpoint...');
console.log('📊 Sending test data:', JSON.stringify(testData, null, 2));

const req = https.request(options, (res) => {
  console.log(`📡 Response Status: ${res.statusCode}`);
  console.log(`📡 Response Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('✅ API Response:', JSON.stringify(response, null, 2));
      
      if (response.status === 'success') {
        console.log('🎉 SUCCESS: Health data was stored in database!');
        console.log(`📊 Data ID: ${response.data_id}`);
        console.log(`🆔 Device ID: ${response.device_id}`);
      } else {
        console.log('⚠️  Response indicates failure');
      }
    } catch (e) {
      console.log('❌ Failed to parse response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end(); 