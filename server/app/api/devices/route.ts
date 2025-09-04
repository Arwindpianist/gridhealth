import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's organization
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, company_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    const organizationId = userRole.organization_id || userRole.company_id
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get devices for the organization with latest health metrics
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select(`
        *,
        device_group_members!left(
          group:device_groups(name)
        ),
        health_metrics!inner(
          id,
          value,
          timestamp,
          metric_type,
          performance_metrics,
          disk_health,
          memory_health,
          network_health,
          service_health,
          security_health
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('device_name')

    if (devicesError) {
      console.error('Error fetching devices:', devicesError)
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    // Format devices with latest health data and group information
    const formattedDevices = devices?.map(device => {
      // Get the latest health metrics for each metric type
      const latestHealth = device.health_metrics?.[0]
      const performanceMetrics = latestHealth?.performance_metrics || {}
      const diskHealth = latestHealth?.disk_health || []
      const memoryHealth = latestHealth?.memory_health || {}
      const networkHealth = latestHealth?.network_health || {}
      const serviceHealth = latestHealth?.service_health || []
      const securityHealth = latestHealth?.security_health || {}

      // Calculate overall health score from the latest health scan
      const healthScan = device.health_metrics?.find((metric: any) => metric.metric_type === 'health_scan')
      const healthScore = healthScan?.value || device.health_score || 100

      // Get group name from the device_group_members relationship
      const groupName = device.device_group_members?.[0]?.group?.name || null

      return {
        ...device,
        group_name: groupName,
        health_score: healthScore,
        performance_metrics: performanceMetrics,
        disk_health: diskHealth,
        memory_health: memoryHealth,
        network_health: networkHealth,
        service_health: serviceHealth,
        security_health: securityHealth,
        last_health_check: healthScan?.timestamp || device.last_health_check,
        device_group_members: undefined, // Remove the raw group object
        health_metrics: undefined // Remove the raw metrics array
      }
    }) || []

    // Get device statistics
    const totalDevices = formattedDevices.length
    const healthyDevices = formattedDevices.filter(d => d.health_status === 'healthy').length
    const warningDevices = formattedDevices.filter(d => d.health_status === 'warning').length
    const criticalDevices = formattedDevices.filter(d => d.health_status === 'critical').length

    return NextResponse.json({
      success: true,
      devices: formattedDevices,
      statistics: {
        total: totalDevices,
        healthy: healthyDevices,
        warning: warningDevices,
        critical: criticalDevices
      }
    })

  } catch (error) {
    console.error('Error in devices API:', error)
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
    const { action, device_id } = body

    if (!action || !device_id) {
      return NextResponse.json({ error: 'Action and device ID are required' }, { status: 400 })
    }

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's organization
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, company_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    const organizationId = userRole.organization_id || userRole.company_id
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Verify device belongs to organization
    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('*, licenses(organization_id)')
      .eq('device_id', device_id)
      .single()

    if (deviceError || !device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    if (device.licenses?.organization_id !== organizationId) {
      return NextResponse.json({ error: 'Device does not belong to this organization' }, { status: 403 })
    }

    switch (action) {
      case 'refresh':
        // Trigger a health scan for the device
        // This would typically involve sending a command to the agent
        // For now, we'll just update the last_health_check timestamp
        const { error: updateError } = await supabaseAdmin
          .from('devices')
          .update({ 
            last_health_check: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('device_id', device_id)

        if (updateError) {
          console.error('Error updating device:', updateError)
          return NextResponse.json({ error: 'Failed to refresh device' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Device refresh initiated'
        })

      case 'deactivate':
        // Deactivate device
        const { error: deactivateError } = await supabaseAdmin
          .from('devices')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('device_id', device_id)

        if (deactivateError) {
          console.error('Error deactivating device:', deactivateError)
          return NextResponse.json({ error: 'Failed to deactivate device' }, { status: 500 })
        }

        return NextResponse.json({
          success: true,
          message: 'Device deactivated successfully'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in devices API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
