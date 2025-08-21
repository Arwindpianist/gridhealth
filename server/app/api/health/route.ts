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

    // Check if device exists, if not register it
    const { data: existingDevice, error: deviceCheckError } = await supabase
      .from('devices')
      .select('device_id, last_seen')
      .eq('device_id', deviceId)
      .single();

    if (deviceCheckError && deviceCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking device:', deviceCheckError);
      return NextResponse.json(
        { error: 'Failed to check device registration' },
        { status: 500 }
      );
    }

    if (!existingDevice) {
      // Register new device
      console.log('🆕 Registering new device:', deviceId);
      
      const { error: deviceInsertError } = await supabase
        .from('devices')
        .insert([
          {
            device_id: deviceId,
            license_key: body.license_key,
            device_name: body.system_info?.hostname || 'Unknown Device',
            device_type: 'workstation',
            os_name: body.system_info?.os_name || 'Unknown OS',
            os_version: body.system_info?.os_version || 'Unknown Version',
            hostname: body.system_info?.hostname || 'Unknown Hostname',
            mac_address: body.system_info?.mac_address || null,
            ip_address: body.system_info?.ip_address || null
          }
        ]);

      if (deviceInsertError) {
        console.error('❌ Failed to register device:', deviceInsertError);
        return NextResponse.json(
          { error: 'Failed to register device' },
          { status: 500 }
        );
      }

      console.log('✅ Device registered successfully');
    } else {
      // Update last_seen for existing device
      console.log('🔄 Updating last_seen for existing device:', deviceId);
      
      const { error: updateError } = await supabase
        .from('devices')
        .update({ last_seen: new Date().toISOString() })
        .eq('device_id', deviceId);

      if (updateError) {
        console.warn('⚠️ Failed to update last_seen:', updateError);
        // Continue anyway, this is not critical
      }
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