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
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    // Get user roles
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('*, organizations(name), companies(name)')
      .eq('user_id', user?.id)

    // Get organizations user has access to
    const { data: organizations } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .in('id', roles?.map(r => r.organization_id).filter(Boolean) || [])

    // Get companies user has access to
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('*')
      .in('id', roles?.map(r => r.company_id).filter(Boolean) || [])

    // Get devices for user's organizations
    const orgIds = organizations?.map(o => o.id) || []
    const { data: devices } = await supabaseAdmin
      .from('devices')
      .select('*')
      .in('organization_id', orgIds)

    // Get licenses for user's organizations
    const { data: licenses } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .in('organization_id', orgIds)

    // Get health metrics for user's devices
    const deviceIds = devices?.map(d => d.id) || []
    const { data: healthMetrics } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .in('device_id', deviceIds)
      .limit(10) // Limit to recent metrics

    return NextResponse.json({
      user: user || null,
      roles: roles || [],
      organizations: organizations || [],
      companies: companies || [],
      devices: devices || [],
      licenses: licenses || [],
      healthMetrics: healthMetrics || [],
      summary: {
        hasUser: !!user,
        hasRoles: (roles?.length || 0) > 0,
        hasOrganizations: (organizations?.length || 0) > 0,
        hasCompanies: (companies?.length || 0) > 0,
        hasDevices: (devices?.length || 0) > 0,
        hasLicenses: (licenses?.length || 0) > 0,
        hasHealthMetrics: (healthMetrics?.length || 0) > 0
      }
    })

  } catch (error) {
    console.error('Error in debug tables API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 