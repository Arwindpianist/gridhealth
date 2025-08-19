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
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('✅ Checkout session completed:', session.id)
  
  const {
    customer_email,
    metadata: { organization_id, tier, device_limit, price_myr }
  } = session

  if (!organization_id || !tier) {
    console.error('❌ Missing metadata in session:', session.metadata)
    return
  }

  try {
    // Generate unique license key
    const licenseKey = generateLicenseKey()
    
    console.log('🔑 Generating license:', {
      licenseKey,
      organization_id,
      tier,
      device_limit,
      price_myr
    })

    // Create license record
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .insert({
        organization_id: organization_id,
        license_key: licenseKey,
        device_limit: parseInt(device_limit),
        price_myr: parseFloat(price_myr),
        status: 'active',
        tier: tier,
        stripe_subscription_id: session.subscription,
        stripe_customer_id: session.customer,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (licenseError) {
      console.error('❌ Error creating license:', licenseError)
      return
    }

    console.log('✅ License created:', license.id)

    // Update organization with license info
    const { error: orgError } = await supabaseAdmin
      .from('organizations')
      .update({
        device_limit: parseInt(device_limit),
        subscription_status: 'active',
        subscription_tier: tier,
        subscription_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        license_id: license.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', organization_id)

    if (orgError) {
      console.error('❌ Error updating organization:', orgError)
      return
    }

    console.log('✅ Organization updated with license info')

    // Send email notification (future implementation)
    // await sendLicenseEmail(customer_email, licenseKey, tier, device_limit)

  } catch (error) {
    console.error('💥 Error in checkout session handler:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  console.log('💰 Invoice payment succeeded:', invoice.id)
  
  // Handle recurring payments for existing subscriptions
  // This ensures licenses are renewed automatically
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

    // Extend license expiration
    const newExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    
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
    await supabaseAdmin
      .from('organizations')
      .update({
        subscription_status: 'inactive',
        updated_at: new Date().toISOString()
      })
      .eq('license_id', subscription.id)

    console.log('✅ License deactivated for subscription:', subscription.id)

  } catch (error) {
    console.error('💥 Error in subscription deletion handler:', error)
  }
} 