import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { group_id, device_ids } = body

    if (!group_id || !device_ids || !Array.isArray(device_ids)) {
      return NextResponse.json({ error: 'Group ID and device IDs array are required' }, { status: 400 })
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

    // Verify user has permission to assign devices
    if (!['owner', 'admin'].includes(userRole.role) && 
        !(userRole.role === 'organization' && userRole.organization_id) &&
        !(userRole.role === 'company' && userRole.company_id)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the device group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('device_groups')
      .select('*')
      .eq('id', group_id)
      .eq('organization_id', organizationId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Device group not found' }, { status: 404 })
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

    // Verify all devices use the same license as the group
    const invalidDevices = devices.filter(device => device.license_key !== group.license_key)
    if (invalidDevices.length > 0) {
      return NextResponse.json({ 
        error: 'Some devices use different licenses than the group',
        invalidDevices: invalidDevices.map(d => d.device_id)
      }, { status: 400 })
    }

    // Remove existing assignments for these devices
    const { error: removeError } = await supabaseAdmin
      .from('device_group_members')
      .delete()
      .in('device_id', device_ids)

    if (removeError) {
      console.error('Error removing existing assignments:', removeError)
      return NextResponse.json({ error: 'Failed to remove existing assignments' }, { status: 500 })
    }

    // Add new assignments
    const assignments = device_ids.map(device_id => ({
      group_id,
      device_id
    }))

    const { error: assignError } = await supabaseAdmin
      .from('device_group_members')
      .insert(assignments)

    if (assignError) {
      console.error('Error assigning devices:', assignError)
      return NextResponse.json({ error: 'Failed to assign devices to group' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${device_ids.length} devices to group "${group.name}"`
    })

  } catch (error) {
    console.error('Error in device assignment API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('group_id')
    const deviceId = searchParams.get('device_id')

    if (!groupId || !deviceId) {
      return NextResponse.json({ error: 'Group ID and device ID are required' }, { status: 400 })
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

    // Verify user has permission to remove device assignments
    if (!['owner', 'admin'].includes(userRole.role) && 
        !(userRole.role === 'organization' && userRole.organization_id) &&
        !(userRole.role === 'company' && userRole.company_id)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Remove the assignment
    const { error: removeError } = await supabaseAdmin
      .from('device_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('device_id', deviceId)

    if (removeError) {
      console.error('Error removing device assignment:', removeError)
      return NextResponse.json({ error: 'Failed to remove device assignment' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Device removed from group successfully'
    })

  } catch (error) {
    console.error('Error in device assignment API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
