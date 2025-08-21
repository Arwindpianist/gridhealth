import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { license_key, action, timestamp } = body

    if (!license_key) {
      return NextResponse.json({ 
        error: 'License key is required' 
      }, { status: 400 })
    }

    if (action !== 'validate') {
      return NextResponse.json({ 
        error: 'Invalid action' 
      }, { status: 400 })
    }

    console.log('🔍 Validating license:', license_key)

    // Check if license exists and is valid
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select(`
        *,
        organizations (
          id,
          name
        )
      `)
      .eq('license_key', license_key)
      .eq('status', 'active')  // Use 'status' instead of 'is_active'
      .single()

    if (licenseError || !license) {
      console.log('❌ License not found or inactive:', license_key)
      console.log('License error:', licenseError)
      console.log('License data:', license)
      return NextResponse.json({
        isValid: false,
        message: 'Invalid or inactive license key',
        organizationName: '',
        deviceLimit: 0,
        licenseType: ''
      })
    }

    console.log('🔍 License found:', {
      id: license.id,
      license_key: license.license_key,
      organization_id: license.organization_id,
      device_limit: license.device_limit,
      status: license.status,
      expires_at: license.expires_at,
      organizations: license.organizations
    })

    // Check if license has expired
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      console.log('❌ License expired:', license_key)
      return NextResponse.json({
        isValid: false,
        message: 'License has expired',
        organizationName: license.organizations?.name || '',
        deviceLimit: 0,
        licenseType: ''
      })
    }

    // Get the device limit from the license itself (not organization)
    const deviceLimit = license.device_limit || 0

    // Check device count for this specific license
    const { data: deviceCount, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('id', { count: 'exact' })
      .eq('license_key', license_key)

    if (deviceError) {
      console.error('❌ Error checking device count:', deviceError)
      return NextResponse.json({
        isValid: false,
        message: 'Error checking device limit',
        organizationName: license.organizations?.name || '',
        deviceLimit: deviceLimit,
        licenseType: 'Standard'
      })
    }

    const currentDeviceCount = deviceCount?.length || 0

    if (currentDeviceCount >= deviceLimit) {
      console.log('❌ Device limit reached for license:', license_key, `${currentDeviceCount}/${deviceLimit}`)
      return NextResponse.json({
        isValid: false,
        message: `Device limit reached (${currentDeviceCount}/${deviceLimit})`,
        organizationName: license.organizations?.name || '',
        deviceLimit: deviceLimit,
        licenseType: 'Standard'
      })
    }

    console.log('✅ License validated successfully:', {
      licenseKey: license_key,
      organization: license.organizations?.name || 'Unknown',
      deviceCount: currentDeviceCount,
      deviceLimit: deviceLimit
    })

    return NextResponse.json({
      isValid: true,
      message: 'License is valid',
      organizationName: license.organizations?.name || 'Licensed Organization',
      deviceLimit: deviceLimit,
      licenseType: 'Standard'
    })

  } catch (error) {
    console.error('❌ Error in license validation API:', error)
    return NextResponse.json({ 
      isValid: false,
      message: 'Internal server error',
      organizationName: '',
      deviceLimit: 0,
      licenseType: ''
    }, { status: 500 })
  }
} 