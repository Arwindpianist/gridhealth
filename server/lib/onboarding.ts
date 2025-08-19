import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export interface OnboardingStatus {
  needsOnboarding: boolean
  isComplete: boolean
  missingFields: string[]
}

export async function checkOnboardingStatus(clerkUserId: string, accessToken?: string): Promise<OnboardingStatus> {
  try {
    // Create authenticated client if we have an access token
    const supabase = accessToken 
      ? createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        })
      : createClient(supabaseUrl, supabaseAnonKey)

    const { data: user, error } = await supabase
      .from('users')
      .select('first_name, last_name, phone')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (error) {
      console.error('Error checking onboarding status:', error)
      return {
        needsOnboarding: true,
        isComplete: false,
        missingFields: ['first_name', 'last_name', 'phone']
      }
    }

    if (!user) {
      return {
        needsOnboarding: true,
        isComplete: false,
        missingFields: ['first_name', 'last_name', 'phone']
      }
    }

    const missingFields: string[] = []
    if (!user.first_name) missingFields.push('first_name')
    if (!user.last_name) missingFields.push('last_name')
    if (!user.phone) missingFields.push('phone')

    const isComplete = missingFields.length === 0

    return {
      needsOnboarding: !isComplete,
      isComplete,
      missingFields
    }
  } catch (error) {
    console.error('Error checking onboarding status:', error)
    return {
      needsOnboarding: true,
      isComplete: false,
      missingFields: ['first_name', 'last_name', 'phone']
    }
  }
}

export function shouldRedirectToOnboarding(status: OnboardingStatus): boolean {
  return status.needsOnboarding
} 