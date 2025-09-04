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

    // Get account managers for the organization
    const { data: accountManagers, error: managersError } = await supabaseAdmin
      .from('account_managers')
      .select(`
        *,
        user:users!fk_account_managers_user(email, clerk_user_id),
        created_by_user:users!fk_account_managers_created_by(email)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (managersError) {
      console.error('Error fetching account managers:', managersError)
      return NextResponse.json({ error: 'Failed to fetch account managers' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      accountManagers: accountManagers || []
    })

  } catch (error) {
    console.error('Error in account managers API:', error)
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
    const { email, role, permissions, group_access } = body

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['owner', 'admin', 'manager', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be one of: owner, admin, manager, viewer' }, { status: 400 })
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

    // Verify user has permission to add account managers (owner, admin, or organization/company owner)
    if (!['owner', 'admin'].includes(userRole.role) && 
        !(userRole.role === 'organization' && userRole.organization_id) &&
        !(userRole.role === 'company' && userRole.company_id)) {
      return NextResponse.json({ error: 'Insufficient permissions. Only owners, admins, and organization/company owners can add account managers.' }, { status: 403 })
    }

    // Prevent non-owners from adding other owners
    if (role === 'owner' && userRole.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can add other owners.' }, { status: 403 })
    }

    // Find the user to add as account manager
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: 'User not found with the provided email' }, { status: 404 })
    }

    // Check if user is already an account manager for this organization
    const { data: existingManager, error: existingError } = await supabaseAdmin
      .from('account_managers')
      .select('id, role')
      .eq('user_id', targetUser.id)
      .eq('organization_id', organizationId)
      .single()

    if (existingManager) {
      return NextResponse.json({ 
        error: 'User is already an account manager for this organization',
        existingRole: existingManager.role
      }, { status: 400 })
    }

    // Create account manager record
    const { data: accountManager, error: createError } = await supabaseAdmin
      .from('account_managers')
      .insert({
        user_id: targetUser.id,
        organization_id: organizationId,
        role,
        permissions: permissions || {},
        group_access: group_access || [],
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating account manager:', createError)
      return NextResponse.json({ error: 'Failed to create account manager' }, { status: 500 })
    }

    // Create or update user role
    const { error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: targetUser.id,
        organization_id: organizationId,
        role: role === 'owner' ? 'owner' : 'member', // Map to user_roles table
        company_id: null
      }, {
        onConflict: 'user_id,organization_id'
      })

    if (userRoleError) {
      console.error('Error updating user role:', userRoleError)
      // Continue anyway as the account manager was created
    }

    return NextResponse.json({
      success: true,
      accountManager,
      message: `Successfully added ${email} as ${role}`
    })

  } catch (error) {
    console.error('Error in account managers API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { managerId, role, permissions, group_access } = body

    if (!managerId) {
      return NextResponse.json({ error: 'Manager ID is required' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['owner', 'admin', 'manager', 'viewer']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be one of: owner, admin, manager, viewer' }, { status: 400 })
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

    // Verify user has permission to edit account managers (owner, admin, or organization/company owner)
    if (!['owner', 'admin'].includes(userRole.role) && 
        !(userRole.role === 'organization' && userRole.organization_id) &&
        !(userRole.role === 'company' && userRole.company_id)) {
      return NextResponse.json({ error: 'Insufficient permissions. Only owners, admins, and organization/company owners can edit account managers.' }, { status: 403 })
    }

    // Get the account manager to update
    const { data: accountManager, error: managerError } = await supabaseAdmin
      .from('account_managers')
      .select('*')
      .eq('id', managerId)
      .eq('organization_id', organizationId)
      .single()

    if (managerError || !accountManager) {
      return NextResponse.json({ error: 'Account manager not found' }, { status: 404 })
    }

    // Prevent non-owners from editing other owners
    if (accountManager.role === 'owner' && userRole.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can edit other owners.' }, { status: 403 })
    }

    // Prevent non-owners from promoting users to owner
    if (role === 'owner' && userRole.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can promote users to owner.' }, { status: 403 })
    }

    // Update account manager
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (role !== undefined) updateData.role = role
    if (permissions !== undefined) updateData.permissions = permissions
    if (group_access !== undefined) updateData.group_access = group_access

    const { data: updatedManager, error: updateError } = await supabaseAdmin
      .from('account_managers')
      .update(updateData)
      .eq('id', managerId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating account manager:', updateError)
      return NextResponse.json({ error: 'Failed to update account manager' }, { status: 500 })
    }

    // Update user role if role was changed
    if (role && role !== accountManager.role) {
      const { error: userRoleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({
          user_id: accountManager.user_id,
          organization_id: organizationId,
          role: role === 'owner' ? 'owner' : 'member', // Map to user_roles table
          company_id: null
        }, {
          onConflict: 'user_id,organization_id'
        })

      if (userRoleError) {
        console.error('Error updating user role:', userRoleError)
        // Continue anyway as the account manager was updated
      }
    }

    return NextResponse.json({
      success: true,
      accountManager: updatedManager,
      message: 'Account manager updated successfully'
    })

  } catch (error) {
    console.error('Error in account managers API:', error)
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
    const managerId = searchParams.get('id')

    if (!managerId) {
      return NextResponse.json({ error: 'Manager ID is required' }, { status: 400 })
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

    // Verify user has permission to remove account managers (owner or admin only)
    if (!['owner', 'admin'].includes(userRole.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the account manager to remove
    const { data: accountManager, error: managerError } = await supabaseAdmin
      .from('account_managers')
      .select('*')
      .eq('id', managerId)
      .eq('organization_id', organizationId)
      .single()

    if (managerError || !accountManager) {
      return NextResponse.json({ error: 'Account manager not found' }, { status: 404 })
    }

    // Prevent removing the last owner
    if (accountManager.role === 'owner') {
      const { data: ownerCount, error: countError } = await supabaseAdmin
        .from('account_managers')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('role', 'owner')

      if (!countError && ownerCount && ownerCount.length <= 1) {
        return NextResponse.json({ error: 'Cannot remove the last organization owner' }, { status: 400 })
      }
    }

    // Prevent non-owners from removing owners
    if (accountManager.role === 'owner' && userRole.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can remove other owners' }, { status: 403 })
    }

    // Remove account manager
    const { error: deleteError } = await supabaseAdmin
      .from('account_managers')
      .delete()
      .eq('id', managerId)

    if (deleteError) {
      console.error('Error removing account manager:', deleteError)
      return NextResponse.json({ error: 'Failed to remove account manager' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Account manager removed successfully'
    })

  } catch (error) {
    console.error('Error in account managers API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
