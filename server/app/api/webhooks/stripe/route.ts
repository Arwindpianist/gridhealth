import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '../../../../lib/stripe'
import { supabaseAdmin } from '../../../../lib/supabase'
import { generateLicenseKey } from '../../../../lib/stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('📨 Stripe webhook received:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      
      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('💥 Error processing webhook:', error)
    console.error('📋 Event data that caused error:', JSON.stringify(event, null, 2))
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('✅ Checkout session completed:', session.id)
  console.log('📋 Session data:', JSON.stringify(session, null, 2))
  
  // Safely extract metadata with fallbacks
  const metadata = session.metadata || {}
  const organization_id = metadata.organization_id
  const billing_cycle = metadata.billing_cycle
  const device_count = metadata.device_count
  const price_per_device = metadata.price_per_device
  const total_price = metadata.total_price
  
  const customer_email = session.customer_email
  const subscriptionId = session.subscription

  if (!organization_id || !device_count || !billing_cycle) {
    console.error('❌ Missing required metadata in session:', {
      organization_id,
      device_count,
      billing_cycle,
      metadata: session.metadata
    })
    return
  }

  try {
    // Generate unique license key
    const licenseKey = generateLicenseKey()
    
    console.log('🔑 Processing license purchase:', {
      licenseKey,
      organization_id,
      billing_cycle,
      device_count,
      price_per_device,
      total_price
    })

    // Check if organization already has an active license
    const { data: existingLicense, error: existingError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('status', 'active')
      .single()

    let license
    let licenseError

    if (existingLicense) {
      // Update existing license with additional devices
      console.log('🔄 Updating existing license with additional devices')
      const newDeviceLimit = existingLicense.device_limit + parseInt(device_count)
      
      const { data: updatedLicense, error: updateError } = await supabaseAdmin
        .from('licenses')
        .update({
          device_limit: newDeviceLimit,
          price_myr: parseFloat(total_price),
          billing_cycle: billing_cycle,
          stripe_subscription_id: subscriptionId,
          expires_at: calculateExpiryDate(billing_cycle),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLicense.id)
        .select()
        .single()

      license = updatedLicense
      licenseError = updateError
      
      console.log(`✅ License updated: ${existingLicense.device_limit} → ${newDeviceLimit} devices`)
    } else {
      // Create new license record
      console.log('🆕 Creating new license record')
      const { data: newLicense, error: createError } = await supabaseAdmin
        .from('licenses')
        .insert({
          organization_id: organization_id,
          license_key: licenseKey,
          device_limit: parseInt(device_count),
          price_myr: parseFloat(total_price),
          status: 'active',
          billing_cycle: billing_cycle,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer,
          expires_at: calculateExpiryDate(billing_cycle),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      license = newLicense
      licenseError = createError
    }

    if (licenseError) {
      console.error('❌ Error creating/updating license:', licenseError)
      return
    }

    console.log('✅ License processed successfully:', license.id)

    // Update organization with license info
    const { error: orgError } = await supabaseAdmin
      .from('organizations')
      .update({
        device_limit: license.device_limit,
        subscription_status: 'active',
        subscription_tier: billing_cycle,
        subscription_expires_at: license.expires_at,
        license_id: license.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', organization_id)

    if (orgError) {
      console.error('❌ Error updating organization:', orgError)
      return
    }

    console.log('✅ Organization updated with license info')

  } catch (error) {
    console.error('💥 Error in checkout session handler:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('💰 Invoice payment succeeded:', invoice.id)
  
  try {
    const subscriptionId = invoice.subscription
    
    // Get license by subscription ID
    const { data: license, error } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    if (error || !license) {
      console.error('❌ License not found for subscription:', subscriptionId)
      return
    }

    // Extend license expiration based on billing cycle
    const newExpiry = calculateExpiryDate(license.billing_cycle)
    
    const { error: updateError } = await supabaseAdmin
      .from('licenses')
      .update({
        expires_at: newExpiry,
        updated_at: new Date().toISOString()
      })
      .eq('id', license.id)

    if (updateError) {
      console.error('❌ Error extending license:', updateError)
      return
    }

    // Update organization subscription expiry
    await supabaseAdmin
      .from('organizations')
      .update({
        subscription_expires_at: newExpiry,
        updated_at: new Date().toISOString()
      })
      .eq('license_id', license.id)

    console.log('✅ License extended for subscription:', subscriptionId)

  } catch (error) {
    console.error('💥 Error in invoice payment handler:', error)
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log('🗑️ Subscription deleted:', subscription.id)
  
  try {
    // Mark license as inactive
    const { error } = await supabaseAdmin
      .from('licenses')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('❌ Error deactivating license:', error)
      return
    }

    // Update organization subscription status
    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('organization_id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (license) {
      await supabaseAdmin
        .from('organizations')
        .update({
          subscription_status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', license.organization_id)
    }

    console.log('✅ License deactivated for subscription:', subscription.id)

  } catch (error) {
    console.error('💥 Error in subscription deletion handler:', error)
  }
}

// Calculate expiry date based on billing cycle
function calculateExpiryDate(billingCycle: string): Date {
  const now = new Date()
  
  switch (billingCycle) {
    case 'quarterly':
      // 3 months from now
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
    case 'annual':
      // 12 months from now
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    default:
      // Default to 3 months
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  }
} 