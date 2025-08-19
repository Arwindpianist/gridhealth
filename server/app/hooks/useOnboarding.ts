import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export interface OnboardingStatus {
  needsOnboarding: boolean
  isComplete: boolean
  missingFields: string[]
}

export function useOnboarding() {
  const { user, isLoaded } = useUser()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>({
    needsOnboarding: false,
    isComplete: false,
    missingFields: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && user) {
      checkOnboardingStatusWithAuth()
    } else if (isLoaded && !user) {
      setIsLoading(false)
    }
  }, [isLoaded, user])

  const checkOnboardingStatusWithAuth = async () => {
    if (user) {
      try {
        setIsLoading(true)
        const response = await fetch('/api/onboarding/status')
        if (response.ok) {
          const status = await response.json()
          setOnboardingStatus(status)
        } else {
          // Fallback to assuming onboarding is needed
          setOnboardingStatus({
            needsOnboarding: true,
            isComplete: false,
            missingFields: ['first_name', 'last_name', 'phone']
          })
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        // Fallback to assuming onboarding is needed
        setOnboardingStatus({
          needsOnboarding: true,
          isComplete: false,
          missingFields: ['first_name', 'last_name', 'phone']
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const refreshOnboardingStatus = async () => {
    if (user) {
      await checkOnboardingStatusWithAuth()
    }
  }

  return {
    onboardingStatus,
    isLoading,
    refreshOnboardingStatus,
    needsOnboarding: onboardingStatus.needsOnboarding,
    isComplete: onboardingStatus.isComplete,
    missingFields: onboardingStatus.missingFields
  }
} 