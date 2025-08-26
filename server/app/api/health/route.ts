import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabase'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GridHealth API',
    version: '1.0.0'
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.device_id || !body.license_key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { device_id, license_key, timestamp, type, status, system_info, network_health, health_score } = body

    // Validate license
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('*, organizations(id, name, subscription_status, device_limit)')
      .eq('license_key', license_key)
      .eq('status', 'active')
      .single()

    if (licenseError || !license) {
      return NextResponse.json({ error: 'Invalid or expired license' }, { status: 403 })
    }

    // Check device limit
    const { data: existingDevices, error: deviceCountError } = await supabaseAdmin
      .from('devices')
      .select('device_id')
      .eq('license_key', license_key)

    if (deviceCountError) {
      console.error('Error counting devices:', deviceCountError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (existingDevices && existingDevices.length >= license.organizations.device_limit) {
      return NextResponse.json({ error: 'Device limit exceeded' }, { status: 403 })
    }

    // Prepare device data for upsert
    const deviceData = {
      device_id,
      license_key,
      device_name: system_info?.device_name || system_info?.hostname || 'Unknown Device',
      hostname: system_info?.hostname || 'Unknown',
      os_name: system_info?.os_name || 'Unknown',
      os_version: system_info?.os_version || 'Unknown',
      os_architecture: system_info?.os_architecture || 'Unknown',
      device_type: system_info?.device_type || 'Unknown',
      mac_address: network_health?.mac_address || 'Unknown',
      ip_address: network_health?.ip_address || 'Unknown',
      processor_count: system_info?.processor_count || 0,
      processor_name: system_info?.processor_name || 'Unknown',
      total_physical_memory: system_info?.total_physical_memory || 0,
      domain: system_info?.domain || 'Unknown',
      workgroup: system_info?.workgroup || 'Unknown',
      last_boot_time: system_info?.last_boot_time || null,
      timezone: system_info?.timezone || 'Unknown',
      activation_date: new Date().toISOString(),
      last_seen: timestamp || new Date().toISOString(),
      is_active: true
    }

    // Upsert device information
    const { error: deviceUpsertError } = await supabaseAdmin
      .from('devices')
      .upsert([deviceData], { onConflict: 'device_id', ignoreDuplicates: false })

    if (deviceUpsertError) {
      console.error('Error upserting device:', deviceUpsertError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Handle different types of health data
    if (type === "heartbeat") {
      // Simple heartbeat - just update device status
      await updateDeviceFromHeartbeat(device_id, body)
      await storeHeartbeatWithRetention(device_id, body)
    } else {
      // Comprehensive health data - store all metrics
      await storeComprehensiveHealthData(device_id, body)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Health data received successfully',
      device_id,
      organization: license.organizations.name
    })

  } catch (error) {
    console.error('Error processing health data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Store comprehensive health data with calculated health scores
 */
async function storeComprehensiveHealthData(deviceId: string, healthData: any) {
  try {
    const { health_score, performance_metrics, disk_health, memory_health, network_health, service_health, security_health, agent_info } = healthData

    // Store overall health score
    if (health_score) {
      await supabaseAdmin.from('health_metrics').insert([{
        device_id: deviceId,
        metric_type: 'health_score',
        value: health_score.overall,
        raw_data: {
          overall: health_score.overall,
          performance: health_score.performance,
          disk: health_score.disk,
          memory: health_score.memory,
          network: health_score.network,
          services: health_score.services,
          security: health_score.security,
          calculated_at: health_score.calculated_at,
          details: health_score.details
        },
        timestamp: new Date().toISOString()
      }])
    }

    // Store performance metrics
    if (performance_metrics) {
      await supabaseAdmin.from('health_metrics').insert([{
        device_id: deviceId,
        metric_type: 'performance',
        value: health_score?.performance || 100,
        raw_data: performance_metrics,
        timestamp: new Date().toISOString()
      }])
    }

    // Store disk health
    if (disk_health && Array.isArray(disk_health)) {
      for (const disk of disk_health) {
        await supabaseAdmin.from('health_metrics').insert([{
          device_id: deviceId,
          metric_type: 'disk_health',
          value: health_score?.disk || 100,
          raw_data: disk,
          timestamp: new Date().toISOString()
        }])
      }
    }

    // Store memory health
    if (memory_health) {
      await supabaseAdmin.from('health_metrics').insert([{
        device_id: deviceId,
        metric_type: 'memory_health',
        value: health_score?.memory || 100,
        raw_data: memory_health,
        timestamp: new Date().toISOString()
      }])
    }

    // Store network health
    if (network_health) {
      await supabaseAdmin.from('health_metrics').insert([{
        device_id: deviceId,
        metric_type: 'network_health',
        value: health_score?.network || 100,
        raw_data: network_health,
        timestamp: new Date().toISOString()
      }])
    }

    // Store service health
    if (service_health && Array.isArray(service_health)) {
      for (const service of service_health) {
        await supabaseAdmin.from('health_metrics').insert([{
          device_id: deviceId,
          metric_type: 'service_health',
          value: health_score?.services || 100,
          raw_data: service,
          timestamp: new Date().toISOString()
        }])
      }
    }

    // Store security health
    if (security_health) {
      await supabaseAdmin.from('health_metrics').insert([{
        device_id: deviceId,
        metric_type: 'security_health',
        value: health_score?.security || 100,
        raw_data: security_health,
        timestamp: new Date().toISOString()
      }])
    }

    // Store agent info
    if (agent_info) {
      await supabaseAdmin.from('health_metrics').insert([{
        device_id: deviceId,
        metric_type: 'agent_info',
        value: 100, // Agent info is always good
        raw_data: agent_info,
        timestamp: new Date().toISOString()
      }])
    }

    console.log(`✅ Comprehensive health data stored for device ${deviceId}`)
  } catch (error) {
    console.error('Error storing comprehensive health data:', error)
  }
}

// Helper function to store heartbeats with retention policy
async function storeHeartbeatWithRetention(deviceId: string, heartbeatData: any) {
  try {
    // Configurable heartbeat retention limit (default: 5)
    const maxHeartbeatsPerDevice = parseInt(process.env.HEARTBEAT_RETENTION_LIMIT || '5');
    
    // Insert new heartbeat as a health metric with type 'heartbeat'
    const { error: insertError } = await supabaseAdmin
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
    const { data: heartbeatCount, error: countError } = await supabaseAdmin
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
      const { data: oldHeartbeats, error: selectError } = await supabaseAdmin
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
        
        const { error: deleteError } = await supabaseAdmin
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
    const { error: deviceUpsertError } = await supabaseAdmin
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