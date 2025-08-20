// Test script for GridHealth Health API endpoint
// Run with: node test-health-api.js

const https = require('https');

const testData = {
  device_id: "TEST-DEVICE-001",
  license_key: "ADMIN-UNLIMITED-749fdd88-cbcc-414b-b679-0b313af45c25",
  timestamp: new Date().toISOString(),
  system_info: {
    hostname: "test-device",
    os_name: "Windows",
    os_version: "10.0.19045",
    os_architecture: "x64",
    machine_name: "TEST-DEVICE-001",
    processor_count: 8,
    total_physical_memory: 17179869184
  },
  performance_metrics: {
    cpu_usage_percent: 25.5,
    memory_usage_percent: 45.2,
    disk_io_read_bytes_per_sec: 1048576,
    disk_io_write_bytes_per_sec: 524288,
    network_bytes_received_per_sec: 524288,
    network_bytes_sent_per_sec: 262144,
    process_count: 150,
    thread_count: 1200,
    handle_count: 500
  },
  agent_info: {
    version: "1.0.0",
    last_heartbeat: new Date().toISOString(),
    scan_frequency_minutes: 1440
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
    'Content-Length': postData.length,
    'User-Agent': 'GridHealth-Test/1.0',
    'X-License-Key': 'ADMIN-UNLIMITED-749fdd88-cbcc-414b-b679-0b313af45c25'
  }
};

console.log('🚀 Testing GridHealth Health API endpoint...');
console.log('📤 Sending data to:', options.hostname + options.path);
console.log('📊 Data size:', postData.length, 'bytes');
console.log('🔑 License key:', testData.license_key);
console.log('📅 Timestamp:', testData.timestamp);

const req = https.request(options, (res) => {
  console.log('\n📥 Response Status:', res.statusCode);
  console.log('📥 Response Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📥 Response Body:', data);
    
    try {
      const response = JSON.parse(data);
      
      if (response.status === 'success') {
        console.log('✅ API test successful! Health data stored in database.');
        console.log('📊 Data ID:', response.data_id);
        console.log('🖥️ Device ID:', response.device_id);
      } else if (response.status === 'healthy') {
        console.log('⚠️ API returned old response format - code not deployed yet!');
        console.log('💡 You need to deploy the updated API code to Vercel.');
      } else {
        console.log('❌ API test failed with status:', response.status);
        if (response.error) {
          console.log('❌ Error:', response.error);
        }
      }
    } catch (e) {
      console.log('❌ Failed to parse response as JSON');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end(); 