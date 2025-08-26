#!/usr/bin/env node

/**
 * Test script for heartbeat cleanup functionality
 * This script demonstrates how to call the cleanup API endpoint
 */

const https = require('https');

// Configuration
const API_BASE_URL = 'https://gridhealth.arwindpianist.store';
const CLEANUP_ENDPOINT = '/api/admin/cleanup-heartbeats';

// Test data
const testPayload = {
  max_heartbeats_per_device: 3  // Keep only 3 heartbeats per device
};

function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: new URL(url).hostname,
      port: 443,
      path: new URL(url).pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testHeartbeatCleanup() {
  console.log('🧪 Testing GridHealth Heartbeat Cleanup API');
  console.log('==========================================');
  console.log(`📡 API Endpoint: ${API_BASE_URL}${CLEANUP_ENDPOINT}`);
  console.log(`📊 Test Configuration: Keep ${testPayload.max_heartbeats_per_device} heartbeats per device`);
  console.log('');

  try {
    console.log('🚀 Sending cleanup request...');
    const response = await makeRequest(`${API_BASE_URL}${CLEANUP_ENDPOINT}`, testPayload);
    
    console.log(`📡 Response Status: ${response.statusCode}`);
    console.log('📋 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200) {
      console.log('');
      console.log('✅ Cleanup request successful!');
      
      if (response.data.summary) {
        console.log(`📊 Devices processed: ${response.data.summary.devices_processed}`);
        console.log(`🗑️ Total records deleted: ${response.data.summary.total_deleted}`);
        console.log(`🎯 Target limit: ${response.data.summary.max_heartbeats_per_device} heartbeats per device`);
      }
    } else {
      console.log('');
      console.log('❌ Cleanup request failed!');
    }
    
  } catch (error) {
    console.error('💥 Error during cleanup test:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testHeartbeatCleanup();
}

module.exports = { testHeartbeatCleanup }; 