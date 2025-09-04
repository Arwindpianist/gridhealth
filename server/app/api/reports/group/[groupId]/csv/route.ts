import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../../../lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groupId = params.groupId

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's organization and role
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

    // Get user's account manager permissions
    const { data: accountManager, error: managerError } = await supabaseAdmin
      .from('account_managers')
      .select('role, permissions, group_access')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()

    // Get the specific group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('device_groups')
      .select(`
        id,
        name,
        description,
        license_key,
        created_at,
        devices:device_group_members(
          device_id,
          added_at,
          device:devices(
            device_id,
            device_name,
            os_name,
            os_version,
            hostname,
            health_status,
            last_seen,
            license_key
          )
        )
      `)
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Check if user has permission to view this group
    const isOwnerOrAdmin = userRole.role === 'owner' || userRole.role === 'admin' || 
                          (userRole.role === 'organization' && userRole.organization_id) ||
                          (userRole.role === 'company' && userRole.company_id)
    
    if (!isOwnerOrAdmin && accountManager) {
      // For account managers, check their permissions
      if (!accountManager.permissions?.access_all) {
        // If user has specific group access, check if this group is included
        if (accountManager.group_access && accountManager.group_access.length > 0) {
          if (!accountManager.group_access.includes(group.name)) {
            return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 })
          }
        } else {
          // If no specific group access, deny access
          return NextResponse.json({ error: 'Access denied to this group' }, { status: 403 })
        }
      }
      // If access_all is true, allow access
    }

    // Get health metrics for all devices in the group
    const deviceIds = group.devices?.map((d: any) => d.device.device_id) || []
    let healthMetrics: any[] = []
    
    if (deviceIds.length > 0) {
      const { data: metrics, error: metricsError } = await supabaseAdmin
        .from('health_metrics')
        .select('*')
        .in('device_id', deviceIds)
        .order('timestamp', { ascending: false })
        .limit(1000) // Limit to prevent memory issues

      if (!metricsError) {
        healthMetrics = metrics || []
      }
    }

    // Generate CSV content
    const csvHeaders = [
      'Device ID',
      'Device Name',
      'Hostname',
      'OS',
      'OS Version',
      'Health Status',
      'Health Score',
      'Last Seen',
      'License Key',
      'Assigned to Group',
      'CPU Usage (%)',
      'Memory Usage (%)',
      'Disk Usage (%)',
      'Network Status',
      'Report Generated'
    ]

    const csvRows = group.devices?.map((d: any) => {
      const device = d.device
      const latestMetrics = healthMetrics
        .filter((m: any) => m.device_id === device.device_id)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

      return [
        device.device_id,
        device.device_name || 'N/A',
        device.hostname,
        device.os_name || 'N/A',
        device.os_version || 'N/A',
        device.health_status || 'unknown',
        latestMetrics?.health_score || 'N/A',
        device.last_seen ? new Date(device.last_seen).toISOString() : 'Never',
        device.license_key,
        group.name,
        latestMetrics?.cpu_usage || 'N/A',
        latestMetrics?.memory_usage || 'N/A',
        latestMetrics?.disk_usage || 'N/A',
        latestMetrics?.network_status || 'N/A',
        new Date().toISOString()
      ]
    }) || []

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${group.name}-group-report-${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Error in group report API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
