import Stripe from 'stripe'

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

// GridHealth License Configuration
export const LICENSE_CONFIG = {
  PRICE_ID: process.env.STRIPE_PRICE_ID!,
  PRICE_MYR: 11.00,
  CURRENCY: 'myr',
  BILLING_CYCLE: '3months',
  BILLING_INTERVAL: 'month',
  BILLING_INTERVAL_COUNT: 3,
}

// License Tiers
export const LICENSE_TIERS = {
  basic: {
    name: 'Basic License',
    devices: 10,
    price: 11.00,
    features: ['Real-time monitoring', 'Basic alerts', 'Personal dashboard']
  },
  standard: {
    name: 'Standard License', 
    devices: 50,
    price: 11.00,
    features: ['Advanced monitoring', 'Team dashboards', 'Advanced alerts', 'Custom reporting']
  },
  professional: {
    name: 'Professional License',
    devices: 100,
    price: 11.00,
    features: ['Enterprise monitoring', 'Multi-tenant dashboards', 'Priority support', 'API access']
  },
  enterprise: {
    name: 'Enterprise License',
    devices: 500,
    price: 11.00,
    features: ['Unlimited monitoring', 'White-label solutions', 'Dedicated support', 'Custom integrations']
  }
}

// Create checkout session for license purchase
export async function createLicenseCheckoutSession(
  customerEmail: string,
  organizationId: string,
  tier: keyof typeof LICENSE_TIERS
) {
  const tierConfig = LICENSE_TIERS[tier]
  
  const session = await stripe.checkout.sessions.create({
    customer_email: customerEmail,
    payment_method_types: ['card'],
    line_items: [
      {
        price: LICENSE_CONFIG.PRICE_ID,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    subscription_data: {
      metadata: {
        organization_id: organizationId,
        tier: tier,
        device_limit: tierConfig.devices.toString(),
        price_myr: tierConfig.price.toString(),
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: {
      organization_id: organizationId,
      tier: tier,
      device_limit: tierConfig.devices.toString(),
      price_myr: tierConfig.price.toString(),
    },
  })

  return session
}

// Generate license key
export function generateLicenseKey(): string {
  const prefix = 'GH-LIC'
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}`.toUpperCase()
}

// Validate license key format
export function validateLicenseKey(licenseKey: string): boolean {
  const pattern = /^GH-LIC-[a-zA-Z0-9]{6,}-[a-zA-Z0-9]{6,}$/
  return pattern.test(licenseKey)
} 