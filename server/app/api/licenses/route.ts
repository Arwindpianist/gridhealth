import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Fetching licenses for user:', userId)

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      console.error('❌ User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's role and organization info
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, company_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('❌ Error checking user role:', roleError)
      return NextResponse.json({ error: 'Error checking user role' }, { status: 500 })
    }

    // If no user role exists, treat as individual user
    if (!userRole) {
      console.log('👤 No user role found, treating as individual user')
      
      return NextResponse.json({
        success: true,
        licenses: [],
        organization: {
          id: 'individual',
          name: 'Individual Account',
          subscription_status: 'active',
          subscription_tier: 'individual',
          device_limit: 3
        }
      })
    }

    // Handle individual users
    if (userRole.role === 'individual') {
      console.log('👤 Individual user accessing licenses')
      
      return NextResponse.json({
        success: true,
        licenses: [],
        organization: {
          id: 'individual',
          name: 'Individual Account',
          subscription_status: 'active',
          subscription_tier: 'individual',
          device_limit: 3
        }
      })
    }

    // Handle organization/company users
    const organizationId = userRole.organization_id || userRole.company_id
    if (!organizationId) {
      console.error('❌ No organization or company found for user')
      return NextResponse.json({ error: 'Organization or company not found' }, { status: 404 })
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (orgError) {
      console.error('❌ Organization not found:', orgError)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get licenses for the organization
    const { data: licenses, error: licensesError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (licensesError) {
      console.error('❌ Error fetching licenses:', licensesError)
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
    }

    console.log('✅ Licenses fetched successfully:', licenses?.length || 0)

    return NextResponse.json({
      success: true,
      licenses: licenses || [],
      organization: {
        id: organization.id,
        name: organization.name,
        subscription_status: organization.subscription_status || 'inactive',
        subscription_tier: organization.subscription_tier || null,
        device_limit: organization.device_limit || 0
      }
    })

  } catch (error) {
    console.error('💥 Error in licenses API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 