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
    const { tier } = body

    if (!tier) {
      return NextResponse.json({ error: 'Tier is required' }, { status: 400 })
    }

    console.log('🛒 License purchase request:', { userId, tier })

    // Get user and organization info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      console.error('❌ User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's organization
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (roleError || !userRole?.organization_id) {
      console.error('❌ User role not found:', roleError)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Check if organization already has an active license
    const { data: existingLicense, error: licenseCheckError } = await supabaseAdmin
      .from('licenses')
      .select('id, status')
      .eq('organization_id', userRole.organization_id)
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
      userRole.organization_id,
      tier
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