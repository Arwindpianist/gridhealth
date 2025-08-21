import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createLicenseCheckoutSession } from '../../../../lib/stripe'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { devices, billingCycle } = body

    if (!devices || devices < 1) {
      return NextResponse.json({ error: 'Device count is required and must be at least 1' }, { status: 400 })
    }

    if (!billingCycle || !['quarterly', 'annual'].includes(billingCycle)) {
      return NextResponse.json({ error: 'Billing cycle is required and must be quarterly or annual' }, { status: 400 })
    }

    console.log('🛒 License purchase request:', { userId, devices, billingCycle })

    // Get user and organization info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
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
      .eq('user_id', user.id)  // Use user.id (internal DB ID) instead of userId (Clerk ID)
      .single()

    if (roleError) {
      console.error('❌ User role not found:', roleError)
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    // Handle individual users
    if (userRole.role === 'individual') {
      console.log('👤 Individual user purchasing license')
      
      // For individual users, create a virtual organization for billing
      const { data: virtualOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: `Individual-${user.email}`,
          description: 'Individual user account',
          contact_email: user.email
        })
        .select()
        .single()

      if (orgError) {
        console.error('❌ Error creating virtual organization:', orgError)
        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
      }

      // Update user role to link to virtual organization
      await supabaseAdmin
        .from('user_roles')
        .update({ organization_id: virtualOrg.id })
        .eq('user_id', user.id)

      // Check if virtual organization already has an active license
      const { data: existingLicense, error: licenseCheckError } = await supabaseAdmin
        .from('licenses')
        .select('id, status')
        .eq('organization_id', virtualOrg.id)
        .eq('status', 'active')
        .single()

      if (existingLicense) {
        console.log('⚠️ Individual user already has active license:', existingLicense.id)
        return NextResponse.json({ 
          error: 'You already have an active license',
          existingLicense: existingLicense.id
        }, { status: 400 })
      }

      // Create Stripe checkout session for individual user
      const session = await createLicenseCheckoutSession(
        user.email,
        virtualOrg.id,
        devices,
        billingCycle
      )

      console.log('✅ Checkout session created for individual user:', session.id)

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        checkoutUrl: session.url
      })
    }

    // Handle organization/company users
    const organizationId = userRole.organization_id || userRole.company_id
    if (!organizationId) {
      console.error('❌ No organization or company found for user')
      return NextResponse.json({ error: 'Organization or company not found' }, { status: 404 })
    }

    // Check if organization already has an active license
    const { data: existingLicense, error: licenseCheckError } = await supabaseAdmin
      .from('licenses')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (existingLicense) {
      console.log('⚠️ Organization already has active license:', existingLicense.id)
      return NextResponse.json({ 
        error: 'Organization already has an active license',
        existingLicense: existingLicense.id
      }, { status: 400 })
    }

    // Create Stripe checkout session
    const session = await createLicenseCheckoutSession(
      user.email,
      organizationId,
      devices,
      billingCycle
    )

    console.log('✅ Checkout session created:', session.id)

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url
    })

  } catch (error) {
    console.error('💥 Error in license purchase API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 