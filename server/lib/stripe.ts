import Stripe from 'stripe'

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

// GridHealth License Configuration
export const LICENSE_CONFIG = {
  QUARTERLY_PRICE_ID: process.env.STRIPE_QUARTERLY_PRICE_ID!, // MYR 15 every 3 months
  ANNUAL_PRICE_ID: process.env.STRIPE_ANNUAL_PRICE_ID!, // MYR 11 every 12 months (4 quarters)
  CURRENCY: 'myr',
}

// Billing Cycles
export const BILLING_CYCLES = {
  quarterly: {
    name: 'Quarterly',
    price: 15.00,
    interval: 'month',
    interval_count: 3,
    description: 'Every 3 months',
    priceId: LICENSE_CONFIG.QUARTERLY_PRICE_ID
  },
  annual: {
    name: 'Annual',
    price: 11.00,
    interval: 'month', 
    interval_count: 12,
    description: 'Every 12 months (Save 27%)',
    priceId: LICENSE_CONFIG.ANNUAL_PRICE_ID
  }
}

// Create checkout session for license purchase
export async function createLicenseCheckoutSession(
  customerEmail: string,
  organizationId: string,
  deviceCount: number,
  billingCycle: keyof typeof BILLING_CYCLES
) {
  const cycle = BILLING_CYCLES[billingCycle]
  
  const session = await stripe.checkout.sessions.create({
    customer_email: customerEmail,
    payment_method_types: ['card'],
    line_items: [
      {
        price: cycle.priceId,
        quantity: deviceCount,
      },
    ],
    mode: 'subscription',
    subscription_data: {
      metadata: {
        organization_id: organizationId,
        billing_cycle: billingCycle,
        device_count: deviceCount.toString(),
        price_per_device: cycle.price.toString(),
        total_price: (cycle.price * deviceCount).toString(),
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/complete?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    metadata: {
      organization_id: organizationId,
      billing_cycle: billingCycle,
      device_count: deviceCount.toString(),
      price_per_device: cycle.price.toString(),
      total_price: (cycle.price * deviceCount).toString(),
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