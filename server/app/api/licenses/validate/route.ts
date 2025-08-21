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
          name,
          subscription_status,
          subscription_tier,
          device_limit
        )
      `)
      .eq('license_key', license_key)
      .eq('is_active', true)
      .single()

    if (licenseError || !license) {
      console.log('❌ License not found or inactive:', license_key)
      return NextResponse.json({
        isValid: false,
        message: 'Invalid or inactive license key',
        organizationName: '',
        deviceLimit: 0,
        licenseType: ''
      })
    }

    // Check if organization is active
    if (!license.organizations || license.organizations.subscription_status !== 'active') {
      console.log('❌ Organization subscription inactive for license:', license_key)
      return NextResponse.json({
        isValid: false,
        message: 'Organization subscription is inactive',
        organizationName: '',
        deviceLimit: 0,
        licenseType: ''
      })
    }

    // Check device limit
    const { data: deviceCount, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('id', { count: 'exact' })
      .eq('license_key', license_key)

    if (deviceError) {
      console.error('❌ Error checking device count:', deviceError)
      return NextResponse.json({
        isValid: false,
        message: 'Error checking device limit',
        organizationName: '',
        deviceLimit: 0,
        licenseType: ''
      })
    }

    const currentDeviceCount = deviceCount?.length || 0
    const deviceLimit = license.organizations.device_limit || 0

    if (currentDeviceCount >= deviceLimit) {
      console.log('❌ Device limit reached for license:', license_key, `${currentDeviceCount}/${deviceLimit}`)
      return NextResponse.json({
        isValid: false,
        message: `Device limit reached (${currentDeviceCount}/${deviceLimit})`,
        organizationName: license.organizations.name,
        deviceLimit: deviceLimit,
        licenseType: license.organizations.subscription_tier || 'Standard'
      })
    }

    console.log('✅ License validated successfully:', {
      licenseKey: license_key,
      organization: license.organizations.name,
      deviceCount: currentDeviceCount,
      deviceLimit: deviceLimit
    })

    return NextResponse.json({
      isValid: true,
      message: 'License is valid',
      organizationName: license.organizations.name,
      deviceLimit: deviceLimit,
      licenseType: license.organizations.subscription_tier || 'Standard'
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