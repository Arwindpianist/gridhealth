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
          device_limit: 0 // No licenses purchased yet
        }
      })
    }

    // Handle individual users
    if (userRole.role === 'individual') {
      console.log('👤 Individual user accessing licenses')
      
      // Get the single aggregated license for individual users (they use virtual organizations)
      let individualLicenses: any[] = []
      let totalDeviceLimit = 0
      
      if (userRole.organization_id) {
        const { data: license, error: licensesError } = await supabaseAdmin
          .from('licenses')
          .select('*')
          .eq('organization_id', userRole.organization_id)
          .eq('status', 'active')
          .single()
        
        if (!licensesError && license) {
          individualLicenses = [license]
          totalDeviceLimit = license.device_limit || 0
        }
      }
      
      return NextResponse.json({
        success: true,
        licenses: individualLicenses,
        organization: {
          id: 'individual',
          name: 'Individual Account',
          subscription_status: individualLicenses.length > 0 ? 'active' : 'inactive',
          subscription_tier: individualLicenses.length > 0 ? 'individual' : null,
          device_limit: totalDeviceLimit // Calculated from actual licenses
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

    // Get the single aggregated license for the organization
    const { data: license, error: licensesError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (licensesError && licensesError.code !== 'PGRST116') {
      console.error('❌ Error fetching license:', licensesError)
      return NextResponse.json({ error: 'Failed to fetch license' }, { status: 500 })
    }

    // Convert single license to array format for consistency
    const licenses = license ? [license] : []

    console.log('✅ Licenses fetched successfully:', licenses?.length || 0)

    // Calculate total device limit from actual licenses, not from organization table
    const totalDeviceLimit = (licenses || []).reduce((sum, license) => sum + (license.device_limit || 0), 0)
    const subscriptionStatus = (licenses || []).length > 0 ? 'active' : 'inactive'
    
    return NextResponse.json({
      success: true,
      licenses: licenses || [],
      organization: {
        id: organization.id,
        name: organization.name,
        subscription_status: subscriptionStatus,
        subscription_tier: (licenses || []).length > 0 ? 'premium' : null,
        device_limit: totalDeviceLimit // Calculated from actual licenses, not hard-coded
      }
    })

  } catch (error) {
    console.error('💥 Error in licenses API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 