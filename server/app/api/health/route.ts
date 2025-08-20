import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    // Store health data in Supabase
    const { data, error } = await supabase
      .from('health_metrics')
      .insert([
        {
          device_id: deviceId,
          license_key: body.license_key,
          timestamp: body.timestamp,
          metric_type: 'system_health', // Add the missing metric_type field
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