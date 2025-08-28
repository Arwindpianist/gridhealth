import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { updateLicenseUsageStats } from '../../../../lib/licenseUtils'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (!userRole?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get license usage statistics
    const { data: usageStats, error: usageError } = await supabaseAdmin
      .from('license_usage')
      .select('*')
      .eq('organization_id', userRole.organization_id)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      console.error('Error fetching usage stats:', usageError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // If no usage stats exist, create them
    if (!usageStats) {
      await updateLicenseUsageStats(userRole.organization_id)
      
      // Fetch the newly created stats
      const { data: newStats, error: newStatsError } = await supabaseAdmin
        .from('license_usage')
        .select('*')
        .eq('organization_id', userRole.organization_id)
        .single()

      if (newStatsError) {
        console.error('Error fetching new usage stats:', newStatsError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        usage: newStats
      })
    }

    return NextResponse.json({
      success: true,
      usage: usageStats
    })

  } catch (error) {
    console.error('Error in GET /api/licenses/usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, license_key, new_limit } = body

    if (!action || !license_key) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user's organization and verify permissions
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, role')
      .eq('user_id', userId)
      .single()

    if (!userRole?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    if (!['owner', 'admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get current license
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', license_key)
      .eq('organization_id', userRole.organization_id)
      .single()

    if (licenseError || !license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 })
    }

    let updatedLimit = license.device_limit

    switch (action) {
      case 'reduce':
        if (new_limit && new_limit < license.device_limit) {
          updatedLimit = new_limit
        }
        break
      
      case 'increase':
        if (new_limit && new_limit > license.device_limit) {
          updatedLimit = new_limit
        }
        break
      
      case 'offload':
        // Count active devices for this license
        const { data: activeDevices, error: devicesError } = await supabaseAdmin
          .from('devices')
          .select('device_id')
          .eq('license_key', license_key)
          .eq('is_active', true)

        if (devicesError) {
          console.error('Error counting active devices:', devicesError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        // Set limit to current active devices (offload unused)
        updatedLimit = activeDevices.length
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update license
    const { error: updateError } = await supabaseAdmin
      .from('licenses')
      .update({ device_limit: updatedLimit })
      .eq('license_key', license_key)

    if (updateError) {
      console.error('Error updating license:', updateError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Update usage statistics
    await updateLicenseUsageStats(userRole.organization_id)

    return NextResponse.json({
      success: true,
      message: `License ${action} successful`,
      new_limit: updatedLimit
    })

  } catch (error) {
    console.error('Error in POST /api/licenses/usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
