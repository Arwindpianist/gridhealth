import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export interface OnboardingStatus {
  needsOnboarding: boolean
  isComplete: boolean
  missingFields: string[]
}

export async function checkOnboardingStatus(clerkUserId: string): Promise<OnboardingStatus> {
  try {
    // For now, let's use the anon client and handle RLS differently
    // We'll check if the user exists and has basic profile info
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Try to get user data - this might fail due to RLS, but that's okay
    const { data: user, error } = await supabase
      .from('users')
      .select('first_name, last_name, phone')
      .eq('clerk_user_id', clerkUserId)
      .single()

    // If we get an error (likely due to RLS), assume onboarding is needed
    if (error) {
      console.log('User data not accessible, assuming onboarding needed:', error.message)
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
    // Default to needing onboarding if there's any error
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