import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { checkOnboardingStatus, OnboardingStatus } from '../../lib/onboarding'

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
      checkOnboardingStatus(user.id).then(status => {
        setOnboardingStatus(status)
        setIsLoading(false)
      })
    } else if (isLoaded && !user) {
      setIsLoading(false)
    }
  }, [isLoaded, user])

  const refreshOnboardingStatus = async () => {
    if (user) {
      setIsLoading(true)
      const status = await checkOnboardingStatus(user.id)
      setOnboardingStatus(status)
      setIsLoading(false)
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