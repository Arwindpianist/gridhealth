'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

type AccountType = 'individual' | 'organization' | 'company'
type OnboardingStep = 'personal' | 'account-type' | 'details' | 'complete'

interface UserProfile {
  first_name: string
  last_name: string
  phone: string
  account_type: AccountType
  organization_name?: string
  company_name?: string
  description?: string
  address?: string
  contact_email?: string
  contact_phone?: string
}

interface ValidationErrors {
  [key: string]: string
}

export default function OnboardingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    account_type: 'individual'
  })

  // Check if user has already completed onboarding
  useEffect(() => {
    if (isLoaded && user) {
      checkOnboardingStatus()
    }
  }, [isLoaded, user])

  const checkOnboardingStatus = async () => {
    try {
      // For now, we'll assume onboarding is needed
      // The actual check will happen server-side when accessing dashboard
      console.log('Checking onboarding status for user:', user?.id)
    } catch (error) {
      console.error('Error checking onboarding status:', error)
    }
  }

  const updateProfile = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateStep = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (currentStep === 'personal') {
      if (!profile.first_name.trim()) {
        newErrors.first_name = 'First name is required'
      }
      if (!profile.last_name.trim()) {
        newErrors.last_name = 'Last name is required'
      }
      if (profile.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(profile.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Please enter a valid phone number'
      }
    }

    if (currentStep === 'details') {
      if (profile.account_type === 'organization' && !profile.organization_name?.trim()) {
        newErrors.organization_name = 'Organization name is required'
      }
      if (profile.account_type === 'company' && !profile.company_name?.trim()) {
        newErrors.company_name = 'Company name is required'
      }
      if (profile.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.contact_email)) {
        newErrors.contact_email = 'Please enter a valid email address'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (!validateStep()) {
      return
    }

    if (currentStep === 'personal') {
      setCurrentStep('account-type')
    } else if (currentStep === 'account-type') {
      setCurrentStep('details')
    } else if (currentStep === 'details') {
      completeOnboarding()
    }
  }

  const prevStep = () => {
    if (currentStep === 'account-type') {
      setCurrentStep('personal')
    } else if (currentStep === 'details') {
      setCurrentStep('account-type')
    }
  }

  const completeOnboarding = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Use the API endpoint instead of direct Supabase calls
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          account_type: profile.account_type,
          organization_name: profile.organization_name,
          company_name: profile.company_name,
          description: profile.description,
          address: profile.address,
          contact_email: profile.contact_email,
          contact_phone: profile.contact_phone
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to complete onboarding')
      }

      setCurrentStep('complete')
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (error) {
      console.error('Error completing onboarding:', error)
      alert('There was an error completing your profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gridhealth-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push('/')
    return null
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className={`step ${currentStep === 'personal' ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Personal Info</div>
            </div>
            <div className={`step-connector ${currentStep !== 'personal' ? 'active' : ''}`}></div>
            <div className={`step ${currentStep === 'account-type' ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Account Type</div>
            </div>
            <div className={`step-connector ${currentStep === 'details' || currentStep === 'complete' ? 'active' : ''}`}></div>
            <div className={`step ${currentStep === 'details' ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Details</div>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="card max-w-2xl mx-auto">
          {currentStep === 'personal' && (
            <PersonalInfoStep 
              profile={profile} 
              updateProfile={updateProfile} 
              errors={errors}
              onNext={nextStep}
            />
          )}

          {currentStep === 'account-type' && (
            <AccountTypeStep 
              profile={profile} 
              updateProfile={updateProfile} 
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 'details' && (
            <DetailsStep 
              profile={profile} 
              updateProfile={updateProfile} 
              errors={errors}
              onNext={nextStep}
              onBack={prevStep}
              isLoading={isLoading}
            />
          )}

          {currentStep === 'complete' && (
            <CompleteStep />
          )}
        </div>
      </div>
    </div>
  )
}

// Step Components
function PersonalInfoStep({ profile, updateProfile, errors, onNext }: {
  profile: UserProfile
  updateProfile: (field: keyof UserProfile, value: string) => void
  errors: ValidationErrors
  onNext: () => void
}) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-white mb-2">Welcome to GridHealth!</h1>
      <p className="text-gray-400 mb-8">Let's get to know you better</p>
      
      <div className="space-y-6 text-left">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            First Name *
          </label>
          <input
            type="text"
            value={profile.first_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProfile('first_name', e.target.value)}
            className={`w-full px-4 py-3 bg-dark-800 border rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 ${
              errors.first_name ? 'border-red-500' : 'border-dark-700 focus:border-gridhealth-500'
            }`}
            placeholder="Enter your first name"
          />
          {errors.first_name && (
            <p className="text-red-400 text-sm mt-1">{errors.first_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Last Name *
          </label>
          <input
            type="text"
            value={profile.last_name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProfile('last_name', e.target.value)}
            className={`w-full px-4 py-3 bg-dark-800 border rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 ${
              errors.last_name ? 'border-red-500' : 'border-dark-700 focus:border-gridhealth-500'
            }`}
            placeholder="Enter your last name"
          />
          {errors.last_name && (
            <p className="text-red-400 text-sm mt-1">{errors.last_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProfile('phone', e.target.value)}
            className={`w-full px-4 py-3 bg-dark-800 border rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 ${
              errors.phone ? 'border-red-500' : 'border-dark-700 focus:border-gridhealth-500'
            }`}
            placeholder="Enter your phone number"
          />
          {errors.phone && (
            <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
          )}
        </div>
      </div>

      <button
        onClick={onNext}
        className="btn-primary w-full mt-8 py-3"
      >
        Continue
      </button>
    </div>
  )
}

function AccountTypeStep({ profile, updateProfile, onNext, onBack }: {
  profile: UserProfile
  updateProfile: (field: keyof UserProfile, value: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const accountTypes = [
    {
      id: 'individual',
      title: 'Individual User',
      description: 'Monitor your personal devices and systems',
      icon: '👤',
      features: ['Personal device monitoring', 'Basic health metrics', 'Free tier access']
    },
    {
      id: 'organization',
      title: 'Organization',
      description: 'Manage devices and users for your organization',
      icon: '🏢',
      features: ['Team management', 'Organization-wide monitoring', 'Advanced analytics']
    },
    {
      id: 'company',
      title: 'System Integrator',
      description: 'Manage multiple organizations and clients',
      icon: '🏭',
      features: ['Multi-tenant management', 'Client organization oversight', 'Enterprise features']
    }
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2 text-center">Choose Your Account Type</h2>
      <p className="text-gray-400 mb-8 text-center">Select the type of account that best fits your needs</p>
      
      <div className="space-y-4">
        {accountTypes.map((type) => (
          <div
            key={type.id}
            className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
              profile.account_type === type.id
                ? 'border-gridhealth-500 bg-gridhealth-500/10'
                : 'border-dark-700 hover:border-dark-600'
            }`}
            onClick={() => updateProfile('account_type', type.id)}
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{type.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{type.title}</h3>
                <p className="text-gray-400 mb-3">{type.description}</p>
                <ul className="space-y-1">
                  {type.features.map((feature, index) => (
                    <li key={index} className="text-sm text-gray-300 flex items-center">
                      <span className="text-green-400 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-4 mt-8">
        <button
          onClick={onBack}
          className="btn-outline flex-1 py-3"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="btn-primary flex-1 py-3"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

function DetailsStep({ profile, updateProfile, errors, onNext, onBack, isLoading }: {
  profile: UserProfile
  updateProfile: (field: keyof UserProfile, value: string) => void
  errors: ValidationErrors
  onNext: () => void
  onBack: () => void
  isLoading: boolean
}) {
  const renderFields = () => {
    if (profile.account_type === 'individual') {
      return (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-white mb-2">You're all set!</h3>
          <p className="text-gray-400">Individual users can start monitoring devices immediately.</p>
        </div>
      )
    }

    if (profile.account_type === 'organization') {
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              value={profile.organization_name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProfile('organization_name', e.target.value)}
              className={`w-full px-4 py-3 bg-dark-800 border rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 ${
                errors.organization_name ? 'border-red-500' : 'border-dark-700 focus:border-gridhealth-500'
              }`}
              placeholder="Enter organization name"
            />
            {errors.organization_name && (
              <p className="text-red-400 text-sm mt-1">{errors.organization_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={profile.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateProfile('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:border-gridhealth-500 focus:ring-1 focus:ring-gridhealth-500"
              placeholder="Brief description of your organization"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={profile.contact_email || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProfile('contact_email', e.target.value)}
              className={`w-full px-4 py-3 bg-dark-800 border rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 ${
                errors.contact_email ? 'border-red-500' : 'border-dark-700 focus:border-gridhealth-500'
              }`}
              placeholder="organization@example.com"
            />
            {errors.contact_email && (
              <p className="text-red-400 text-sm mt-1">{errors.contact_email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              value={profile.contact_phone || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProfile('contact_phone', e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:border-gridhealth-500 focus:ring-1 focus:ring-gridhealth-500"
              placeholder="Enter contact phone number"
            />
          </div>
        </div>
      )
    }

    if (profile.account_type === 'company') {
      return (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={profile.company_name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProfile('company_name', e.target.value)}
              className={`w-full px-4 py-3 bg-dark-800 border rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 ${
                errors.company_name ? 'border-red-500' : 'border-dark-700 focus:border-gridhealth-500'
              }`}
              placeholder="Enter company name"
            />
            {errors.company_name && (
              <p className="text-red-400 text-sm mt-1">{errors.company_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Company Description
            </label>
            <textarea
              value={profile.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateProfile('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:ring-1 focus:ring-gridhealth-500"
              placeholder="Brief description of your company"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Address
            </label>
            <textarea
              value={profile.address || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateProfile('address', e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:border-gridhealth-500 focus:ring-1 focus:ring-gridhealth-500"
              placeholder="Enter company address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contact Phone
            </label>
            <input
              type="tel"
              value={profile.contact_phone || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateProfile('contact_phone', e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:border-gridhealth-500 focus:ring-1 focus:ring-gridhealth-500"
              placeholder="Enter company phone number"
            />
          </div>
        </div>
      )
    }
  }

  const canProceed = () => {
    if (profile.account_type === 'individual') return true
    if (profile.account_type === 'organization') return !!profile.organization_name
    if (profile.account_type === 'company') return !!profile.company_name
    return false
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-2 text-center">Additional Details</h2>
      <p className="text-gray-400 mb-8 text-center">Please provide some additional information</p>
      
      {renderFields()}

      <div className="flex space-x-4 mt-8">
        <button
          onClick={onBack}
          className="btn-outline flex-1 py-3"
          disabled={isLoading}
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="btn-primary flex-1 py-3"
          disabled={!canProceed() || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Setting up...
            </div>
          ) : (
            'Complete Setup'
          )}
        </button>
      </div>
    </div>
  )
}

function CompleteStep() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-3xl font-bold text-white mb-4">Welcome to GridHealth!</h2>
      <p className="text-gray-400 mb-8">Your account has been set up successfully. Redirecting you to the dashboard...</p>
      
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gridhealth-500 mx-auto"></div>
    </div>
  )
} 