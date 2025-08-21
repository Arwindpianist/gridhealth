import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Fetching user role for:', userId)

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, phone')
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

    let organizationData = null
    let companyData = null

    if (userRole?.organization_id) {
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id, name, description, address, contact_email, contact_phone')
        .eq('id', userRole.organization_id)
        .single()

      if (!orgError) {
        organizationData = org
      }
    }

    if (userRole?.company_id) {
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .select('id, name, email, phone, address')
        .eq('id', userRole.company_id)
        .single()

      if (!companyError) {
        companyData = company
      }
    }

    // Determine if profile is complete based on role and required data
    let isComplete = false
    
    if (user.first_name && user.last_name && user.phone && userRole?.role) {
      if (userRole.role === 'individual') {
        // Individual users are complete if they have all basic info
        isComplete = true
      } else if (userRole.role === 'organization' || userRole.role === 'owner') {
        // Organization users and owners need complete organization details
        if (userRole.organization_id && organizationData) {
          const orgComplete = organizationData.name && 
                             organizationData.description && 
                             organizationData.contact_email && 
                             organizationData.contact_phone
          isComplete = orgComplete
        }
      } else if (userRole.role === 'company') {
        // Company users need complete company details
        if (userRole.company_id && companyData) {
          const companyComplete = companyData.name && 
                                 companyData.email && 
                                 companyData.phone && 
                                 companyData.address
          isComplete = companyComplete
        }
      } else if (userRole.role === 'admin') {
        // Admin users are complete if they have all basic info
        isComplete = true
      }
    }

    console.log('🔍 Profile completion check:', {
      userId: user.id,
      hasName: !!(user.first_name && user.last_name),
      hasPhone: !!user.phone,
      hasRole: !!userRole?.role,
      role: userRole?.role,
      hasOrgData: !!organizationData,
      hasCompanyData: !!companyData,
      orgComplete: userRole?.role === 'organization' ? 
        !!(organizationData?.name && organizationData?.description && organizationData?.contact_email && organizationData?.contact_phone) : null,
      companyComplete: userRole?.role === 'company' ? 
        !!(companyData?.name && companyData?.email && companyData?.phone && companyData?.address) : null,
      isComplete: isComplete
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone
      },
      userRole: userRole || null,
      organization: organizationData,
      company: companyData,
      isComplete: isComplete
    })

  } catch (error) {
    console.error('💥 Error in user role API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 