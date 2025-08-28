import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../../lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groupId = params.id

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

    // Verify group belongs to organization
    const { data: group, error: groupError } = await supabaseAdmin
      .from('device_groups')
      .select('*')
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Device group not found' }, { status: 404 })
    }

    // Get devices in this group
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select(`
        *,
        health_metrics!inner(
          id,
          value,
          timestamp,
          metric_type
        )
      `)
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('device_name')

    if (devicesError) {
      console.error('Error fetching devices:', devicesError)
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    // Format devices with latest health data
    const formattedDevices = devices?.map(device => {
      const latestHealth = device.health_metrics?.[0]
      return {
        ...device,
        latest_health_score: latestHealth?.value || 100,
        latest_health_check: latestHealth?.timestamp || device.last_health_check,
        health_metrics: undefined // Remove the raw metrics array
      }
    }) || []

    return NextResponse.json({
      success: true,
      group,
      devices: formattedDevices
    })

  } catch (error) {
    console.error('Error in device group devices API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groupId = params.id
    const body = await request.json()
    const { device_ids } = body

    if (!device_ids || !Array.isArray(device_ids)) {
      return NextResponse.json({ error: 'Device IDs array is required' }, { status: 400 })
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

    // Verify group belongs to organization
    const { data: group, error: groupError } = await supabaseAdmin
      .from('device_groups')
      .select('*')
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Device group not found' }, { status: 404 })
    }

    // Verify user has permission to modify groups (admin or owner)
    if (!['owner', 'admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify all devices belong to the organization
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select('device_id, license_key')
      .in('device_id', device_ids)

    if (devicesError) {
      console.error('Error fetching devices:', devicesError)
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    if (devices.length !== device_ids.length) {
      return NextResponse.json({ error: 'Some devices not found' }, { status: 400 })
    }

    // Verify all devices use licenses from the same organization
    const { data: licenses, error: licensesError } = await supabaseAdmin
      .from('licenses')
      .select('license_key, organization_id')
      .in('license_key', devices.map(d => d.license_key))

    if (licensesError) {
      console.error('Error fetching licenses:', licensesError)
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
    }

    const invalidDevices = devices.filter(device => {
      const license = licenses.find(l => l.license_key === device.license_key)
      return !license || license.organization_id !== organizationId
    })

    if (invalidDevices.length > 0) {
      return NextResponse.json({ error: 'Some devices do not belong to this organization' }, { status: 403 })
    }

    // Add devices to group
    const { error: addError } = await supabaseAdmin
      .from('device_group_members')
      .insert(
        device_ids.map(deviceId => ({
          device_id: deviceId,
          group_id: groupId
        }))
      )

    if (addError) {
      console.error('Error adding devices to group:', addError)
      return NextResponse.json({ error: 'Failed to add devices to group' }, { status: 500 })
    }

    // Update devices table to set group_id
    const { error: updateError } = await supabaseAdmin
      .from('devices')
      .update({ group_id: groupId })
      .in('device_id', device_ids)

    if (updateError) {
      console.error('Error updating devices:', updateError)
      return NextResponse.json({ error: 'Failed to update devices' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Added ${device_ids.length} devices to group`
    })

  } catch (error) {
    console.error('Error in device group devices API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const groupId = params.id
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('device_id')

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 })
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

    // Verify group belongs to organization
    const { data: group, error: groupError } = await supabaseAdmin
      .from('device_groups')
      .select('*')
      .eq('id', groupId)
      .eq('organization_id', organizationId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Device group not found' }, { status: 404 })
    }

    // Verify user has permission to modify groups (admin or owner)
    if (!['owner', 'admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Remove device from group
    const { error: removeError } = await supabaseAdmin
      .from('device_group_members')
      .delete()
      .eq('device_id', deviceId)
      .eq('group_id', groupId)

    if (removeError) {
      console.error('Error removing device from group:', removeError)
      return NextResponse.json({ error: 'Failed to remove device from group' }, { status: 500 })
    }

    // Update device to remove group_id
    const { error: updateError } = await supabaseAdmin
      .from('devices')
      .update({ group_id: null })
      .eq('device_id', deviceId)

    if (updateError) {
      console.error('Error updating device:', updateError)
      return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Device removed from group'
    })

  } catch (error) {
    console.error('Error in device group devices API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
