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

    // Get device groups with device counts
    const { data: groups, error: groupsError } = await supabaseAdmin
      .from('device_groups')
      .select(`
        *,
        devices:device_group_members(count),
        license:licenses(device_limit, status)
      `)
      .eq('organization_id', organizationId)

    if (groupsError) {
      console.error('Error fetching device groups:', groupsError)
      return NextResponse.json({ error: 'Failed to fetch device groups' }, { status: 500 })
    }

    // Format the response
    const formattedGroups = groups?.map(group => ({
      ...group,
      device_count: group.devices?.[0]?.count || 0,
      license_limit: group.license?.device_limit || 0,
      license_status: group.license?.status || 'inactive'
    })) || []

    return NextResponse.json({
      success: true,
      groups: formattedGroups
    })

  } catch (error) {
    console.error('Error in device groups API:', error)
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
    const { name, description, license_key } = body

    if (!name || !license_key) {
      return NextResponse.json({ error: 'Name and license key are required' }, { status: 400 })
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

    // Verify user has permission to create groups (admin, owner, or organization/company owner)
    if (!['owner', 'admin'].includes(userRole.role) && 
        !(userRole.role === 'organization' && userRole.organization_id) &&
        !(userRole.role === 'company' && userRole.company_id)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify license belongs to organization
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('organization_id, status')
      .eq('license_key', license_key)
      .single()

    if (licenseError || !license) {
      return NextResponse.json({ error: 'Invalid license key' }, { status: 400 })
    }

    if (license.organization_id !== organizationId) {
      return NextResponse.json({ error: 'License does not belong to this organization' }, { status: 403 })
    }

    if (license.status !== 'active') {
      return NextResponse.json({ error: 'License is not active' }, { status: 400 })
    }

    // Create device group
    const { data: group, error: createError } = await supabaseAdmin
      .from('device_groups')
      .insert({
        name,
        description,
        organization_id: organizationId,
        license_key,
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating device group:', createError)
      return NextResponse.json({ error: 'Failed to create device group' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      group
    })

  } catch (error) {
    console.error('Error in device groups API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
