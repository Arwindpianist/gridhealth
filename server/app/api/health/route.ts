import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Calculate overall health score based on performance metrics
function calculateHealthScore(performanceMetrics: any): number {
  if (!performanceMetrics) return 100;
  
  let score = 100;
  
  // CPU usage penalty (0-100% usage)
  if (performanceMetrics.cpu_usage_percent) {
    const cpuUsage = Math.min(100, Math.max(0, performanceMetrics.cpu_usage_percent));
    score -= (cpuUsage * 0.3); // CPU usage reduces score by up to 30 points
  }
  
  // Memory usage penalty (0-100% usage)
  if (performanceMetrics.memory_usage_percent) {
    const memoryUsage = Math.min(100, Math.max(0, performanceMetrics.memory_usage_percent));
    score -= (memoryUsage * 0.2); // Memory usage reduces score by up to 20 points
  }
  
  // Process count penalty (if too many processes)
  if (performanceMetrics.process_count) {
    const processCount = performanceMetrics.process_count;
    if (processCount > 500) score -= 10; // Penalty for high process count
    if (processCount > 1000) score -= 20; // Higher penalty for very high process count
  }
  
  // Ensure score stays within 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GridHealth API',
    version: '1.0.0'
  })
}

export async function POST(request: Request) {
  try {
    // Get the request body
    const body = await request.json()
    
    // Validate required fields
    if (!body.device_id || !body.license_key || !body.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: device_id, license_key, timestamp' },
        { status: 400 }
      )
    }

    // Validate license key against licenses table
    const { data: licenseData, error: licenseError } = await supabase
      .from('licenses')
      .select('id, status, expires_at, device_limit')
      .eq('license_key', body.license_key)
      .single()

    if (licenseError || !licenseData) {
      console.error('❌ License validation failed:', licenseError)
      return NextResponse.json(
        { error: 'Invalid or expired license key' },
        { status: 401 }
      )
    }

    if (licenseData.status !== 'active') {
      console.error('❌ License is not active:', licenseData.status)
      return NextResponse.json(
        { error: 'License is not active' },
        { status: 401 }
      )
    }

    if (new Date(licenseData.expires_at) < new Date()) {
      console.error('❌ License has expired:', licenseData.expires_at)
      return NextResponse.json(
        { error: 'License has expired' },
        { status: 401 }
      )
    }

    console.log('✅ License validated:', {
      license_id: licenseData.id,
      status: licenseData.status,
      expires_at: licenseData.expires_at,
      device_limit: licenseData.device_limit
    })

    console.log('📊 Received health data:', {
      device_id: body.device_id,
      license_key: body.license_key.substring(0, 20) + '...',
      timestamp: body.timestamp,
      data_size: JSON.stringify(body).length
    })

    // Generate a proper UUID for device_id if it's not already a UUID
    let deviceId = body.device_id;
    if (!deviceId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      deviceId = randomUUID();
      console.log('🔄 Generated UUID for device_id:', deviceId);
    }

    // Use upsert logic to either insert new device or update existing one
    const deviceData = {
      device_id: deviceId,
      license_key: body.license_key,
      device_name: body.system_info?.hostname || body.system_info?.machine_name || 'Unknown Device',
      device_type: 'workstation',
      os_name: body.system_info?.os_name || 'Unknown OS',
      os_version: body.system_info?.os_version || 'Unknown Version',
      hostname: body.system_info?.hostname || body.system_info?.machine_name || 'Unknown Hostname',
      mac_address: body.network_health?.network_interfaces?.[0]?.mac_address || null,
      ip_address: body.network_health?.network_interfaces?.[0]?.ip_addresses?.[0] || null,
      is_active: true,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Use upsert to either insert new device or update existing one
    const { error: deviceUpsertError } = await supabase
      .from('devices')
      .upsert([deviceData], {
        onConflict: 'device_id',
        ignoreDuplicates: false
      });

    if (deviceUpsertError) {
      console.error('❌ Failed to upsert device:', deviceUpsertError);
      return NextResponse.json(
        { error: 'Failed to register/update device' },
        { status: 500 }
      );
    }

    console.log('✅ Device registered/updated successfully:', deviceId);

    // If this is just a heartbeat (no full health data), return early
    if (body.type === "heartbeat") {
      console.log('💓 Heartbeat received from device:', deviceId);
      
      // Extract system information from heartbeat and update device details
      await updateDeviceFromHeartbeat(deviceId, body);
      
      // Store heartbeat data with retention policy in health_metrics table
      await storeHeartbeatWithRetention(deviceId, body);
      
      return NextResponse.json({
        status: 'success',
        message: 'Heartbeat received',
        device_id: deviceId,
        timestamp: new Date().toISOString(),
        type: 'heartbeat'
      });
    }

    // Store health data in Supabase
    const { data, error } = await supabase
      .from('health_metrics')
      .insert([
        {
          device_id: deviceId,
          license_key: body.license_key,
          timestamp: body.timestamp,
          metric_type: 'system_health', // Add the missing metric_type field
          value: calculateHealthScore(body.performance_metrics), // Calculate health score (0-100)
          system_info: body.system_info || {},
          performance_metrics: body.performance_metrics || {},
          disk_health: body.disk_health || [],
          memory_health: body.memory_health || {},
          network_health: body.network_health || {},
          service_health: body.service_health || [],
          security_health: body.security_health || {},
          agent_info: body.agent_info || {},
          raw_data: body // Store complete raw data for debugging
        }
      ])
      .select()

    if (error) {
      console.error('❌ Supabase insert error:', error)
      return NextResponse.json(
        { error: 'Failed to store health data', details: error.message },
        { status: 500 }
      )
    }

    console.log('✅ Health data stored successfully:', {
      id: data[0]?.id,
      device_id: body.device_id,
      timestamp: body.timestamp
    })

    // Return success response
    return NextResponse.json({
      status: 'success',
      message: 'Health data stored successfully',
      timestamp: new Date().toISOString(),
      data_id: data[0]?.id,
      device_id: deviceId,
      original_device_id: body.device_id
    })

  } catch (error) {
    console.error('❌ Health data processing error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper function to store heartbeats with retention policy
async function storeHeartbeatWithRetention(deviceId: string, heartbeatData: any) {
  try {
    // Configurable heartbeat retention limit (default: 5)
    const maxHeartbeatsPerDevice = parseInt(process.env.HEARTBEAT_RETENTION_LIMIT || '5');
    
    // Insert new heartbeat as a health metric with type 'heartbeat'
    const { error: insertError } = await supabase
      .from('health_metrics')
      .insert([
        {
          device_id: deviceId,
          license_key: heartbeatData.license_key,
          timestamp: heartbeatData.timestamp,
          metric_type: 'heartbeat', // Mark as heartbeat type
          value: 100, // Heartbeat is always "healthy"
          unit: null,
          system_info: heartbeatData.system_info || {},
          performance_metrics: {},
          disk_health: [],
          memory_health: {},
          network_health: {},
          service_health: [],
          security_health: {},
          agent_info: {},
          raw_data: heartbeatData
        }
      ]);

    if (insertError) {
      console.error('❌ Failed to store heartbeat:', insertError);
      return;
    }

    // Get count of heartbeat records for this device
    const { data: heartbeatCount, error: countError } = await supabase
      .from('health_metrics')
      .select('id', { count: 'exact' })
      .eq('device_id', deviceId)
      .eq('metric_type', 'heartbeat');

    if (countError) {
      console.error('❌ Error counting heartbeats:', countError);
      return;
    }

    const currentCount = heartbeatCount?.length || 0;

    // If we have more than the limit, delete the oldest heartbeat records
    if (currentCount > maxHeartbeatsPerDevice) {
      const heartbeatsToDelete = currentCount - maxHeartbeatsPerDevice;
      
      // Get the oldest heartbeat records to delete
      const { data: oldHeartbeats, error: selectError } = await supabase
        .from('health_metrics')
        .select('id')
        .eq('device_id', deviceId)
        .eq('metric_type', 'heartbeat')
        .order('timestamp', { ascending: true })
        .limit(heartbeatsToDelete);

      if (selectError) {
        console.error('❌ Error selecting old heartbeats:', selectError);
        return;
      }

      if (oldHeartbeats && oldHeartbeats.length > 0) {
        const idsToDelete = oldHeartbeats.map(h => h.id);
        
        const { error: deleteError } = await supabase
          .from('health_metrics')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error('❌ Error deleting old heartbeats:', deleteError);
        } else {
          console.log(`🗑️ Deleted ${idsToDelete.length} old heartbeat records for device ${deviceId} (keeping ${maxHeartbeatsPerDevice} latest)`);
        }
      }
    }

    console.log('💓 Heartbeat stored successfully with retention policy');
  } catch (error) {
    console.error('❌ Error in heartbeat storage:', error);
  }
}

// Helper function to update device information from heartbeat data
async function updateDeviceFromHeartbeat(deviceId: string, heartbeatData: any) {
  try {
    console.log('🔧 Updating device information from heartbeat data...');
    
    // Extract system information from heartbeat
    const systemInfo = heartbeatData.system_info || {};
    const networkHealth = heartbeatData.network_health || {};
    
    // Get network interface information
    let macAddress = null;
    let ipAddress = null;
    
    if (networkHealth.network_interfaces && networkHealth.network_interfaces.length > 0) {
      const primaryInterface = networkHealth.network_interfaces[0];
      macAddress = primaryInterface.mac_address || null;
      if (primaryInterface.ip_addresses && primaryInterface.ip_addresses.length > 0) {
        ipAddress = primaryInterface.ip_addresses[0];
      }
    }
    
    // Prepare device update data
    const deviceUpdateData = {
      device_id: deviceId,
      license_key: heartbeatData.license_key,
      device_name: systemInfo.hostname || systemInfo.machine_name || 'Unknown Device',
      device_type: 'workstation',
      os_name: systemInfo.os_name || 'Windows', // Default to Windows for now
      os_version: systemInfo.os_version || 'Unknown Version',
      hostname: systemInfo.hostname || systemInfo.machine_name || 'Unknown Hostname',
      mac_address: macAddress,
      ip_address: ipAddress,
      is_active: true,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📝 Device update data:', {
      device_id: deviceId,
      device_name: deviceUpdateData.device_name,
      os_name: deviceUpdateData.os_name,
      os_version: deviceUpdateData.os_version,
      hostname: deviceUpdateData.hostname,
      mac_address: deviceUpdateData.mac_address,
      ip_address: deviceUpdateData.ip_address
    });

    // Update device information using upsert
    const { error: deviceUpsertError } = await supabase
      .from('devices')
      .upsert([deviceUpdateData], {
        onConflict: 'device_id',
        ignoreDuplicates: false
      });

    if (deviceUpsertError) {
      console.error('❌ Failed to update device information:', deviceUpsertError);
    } else {
      console.log('✅ Device information updated successfully from heartbeat');
    }
    
  } catch (error) {
    console.error('❌ Error updating device from heartbeat:', error);
  }
} 