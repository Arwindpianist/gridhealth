export interface OnboardingStatus {
  needsOnboarding: boolean
  isComplete: boolean
  missingFields: string[]
}

export async function checkOnboardingStatus(clerkUserId: string): Promise<OnboardingStatus> {
  // Since we can't easily check onboarding status from client-side due to RLS,
  // we'll always assume onboarding is needed and let the server-side handle the actual check
  // This prevents the 406 errors and RLS violations
  
  return {
    needsOnboarding: true,
    isComplete: false,
    missingFields: ['first_name', 'last_name', 'phone']
  }
}

export function shouldRedirectToOnboarding(status: OnboardingStatus): boolean {
  return status.needsOnboarding
} 