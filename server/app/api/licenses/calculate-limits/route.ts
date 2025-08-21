import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Calculating device limits for user:', userId)

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

    let totalDeviceLimit = 0
    let activeLicenses = 0
    let organizationId = null
    let organizationName = 'Unknown'

    if (userRole) {
      if (userRole.role === 'individual') {
        // Individual users use virtual organizations
        if (userRole.organization_id) {
          organizationId = userRole.organization_id
          
          // Get organization name
          const { data: org } = await supabaseAdmin
            .from('organizations')
            .select('name')
            .eq('id', organizationId)
            .single()
          
          if (org) {
            organizationName = org.name
          }
        }
      } else if (userRole.organization_id) {
        // Organization users
        organizationId = userRole.organization_id
        
        // Get organization name
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('name')
          .eq('id', organizationId)
          .single()
        
        if (org) {
          organizationName = org.name
        }
      } else if (userRole.company_id) {
        // Company users
        organizationId = userRole.company_id
        
        // Get company name
        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('name')
          .eq('id', organizationId)
          .single()
        
        if (company) {
          organizationName = company.name
        }
      }
    }

    // Calculate device limits from actual licenses
    if (organizationId) {
      const { data: licenses, error: licensesError } = await supabaseAdmin
        .from('licenses')
        .select('device_limit, status, expires_at')
        .eq('organization_id', organizationId)
        .eq('status', 'active')

      if (!licensesError && licenses) {
        const now = new Date()
        activeLicenses = licenses.length
        
        // Sum up device limits from active, non-expired licenses
        totalDeviceLimit = licenses
          .filter(license => {
            if (!license.expires_at) return true
            return new Date(license.expires_at) > now
          })
          .reduce((sum, license) => sum + (license.device_limit || 0), 0)
      }
    }

    console.log('✅ Device limits calculated:', {
      userId,
      role: userRole?.role,
      organizationName,
      totalDeviceLimit,
      activeLicenses
    })

    return NextResponse.json({
      success: true,
      deviceLimits: {
        totalDeviceLimit,
        activeLicenses,
        organizationName,
        role: userRole?.role || 'unknown'
      }
    })

  } catch (error) {
    console.error('💥 Error calculating device limits:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 