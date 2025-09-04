import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../lib/supabase'

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

    // Get device groups for the organization
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('device_groups')
      .select(`
        id,
        name,
        description,
        license_key,
        created_at,
        devices:device_group_members(
          device_id,
          assigned_at,
          device:devices(
            device_id,
            device_name,
            os_name,
            os_version,
            hostname,
            health_status,
            last_heartbeat,
            license_key
          )
        )
      `)
      .eq('organization_id', organizationId)
      .order('name')

    if (groupsError) {
      console.error('Error fetching device groups:', groupsError)
      return NextResponse.json({ error: 'Failed to fetch device groups' }, { status: 500 })
    }

    // Filter groups based on user permissions
    let filteredGroups = groups || []
    
    if (accountManager && !accountManager.permissions?.access_all) {
      // If user has specific group access, filter by that
      if (accountManager.group_access && accountManager.group_access.length > 0) {
        filteredGroups = filteredGroups.filter(group => 
          accountManager.group_access.includes(group.name)
        )
      } else {
        // If no specific group access, show no groups
        filteredGroups = []
      }
    }

         // Format the response
     const formattedGroups = filteredGroups.map(group => ({
       id: group.id,
       name: group.name,
       description: group.description,
       license_key: group.license_key,
       created_at: group.created_at,
       devices: group.devices?.map((d: any) => ({
         ...d.device,
         assigned_at: d.assigned_at
       })) || [],
       device_count: group.devices?.length || 0
     }))

     // Get unassigned devices (devices that belong to the organization but aren't in any group)
     const { data: allDevices, error: devicesError } = await supabaseAdmin
       .from('devices')
       .select(`
         device_id, 
         device_name, 
         os_name, 
         os_version, 
         hostname, 
         health_status, 
         last_heartbeat, 
         license_key,
         licenses!inner(organization_id)
       `)
       .eq('licenses.organization_id', organizationId)

     if (devicesError) {
       console.error('Error fetching devices:', devicesError)
       return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
     }

     // Get all assigned device IDs
     const assignedDeviceIds = new Set<string>()
     formattedGroups.forEach(group => {
       if (group.devices && Array.isArray(group.devices)) {
         group.devices.forEach((device: any) => {
           if (device && device.device_id) {
             assignedDeviceIds.add(device.device_id)
           }
         })
       }
     })

    // Filter out assigned devices to get unassigned ones
    const unassignedDevices = allDevices?.filter(device => !assignedDeviceIds.has(device.device_id)) || []

    return NextResponse.json({
      success: true,
      groups: formattedGroups,
      unassigned_devices: unassignedDevices,
      total_devices: allDevices?.length || 0,
      assigned_devices: assignedDeviceIds.size,
      unassigned_count: unassignedDevices.length
    })

  } catch (error) {
    console.error('Error in devices by groups API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
