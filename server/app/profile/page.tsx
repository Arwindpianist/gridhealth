'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserProfile {
  first_name: string
  last_name: string
  phone: string
  account_type?: string
  organization_name?: string
  company_name?: string
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    account_type: 'individual',
    organization_name: '',
    company_name: ''
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isLoaded && user) {
      loadProfile()
    }
  }, [isLoaded, user])

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/onboarding/status')
      if (response.ok) {
        const status = await response.json()
        if (status.user) {
          setProfile(prev => ({
            ...prev,
            first_name: status.user.first_name || '',
            last_name: status.user.last_name || '',
            phone: status.user.phone || ''
          }))
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const updateProfile = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const saveProfile = async () => {
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      setMessage('First name and last name are required')
      return
    }

    // Validate company/organization name if selected
    if (profile.account_type === 'company' && !profile.company_name?.trim()) {
      setMessage('Company name is required for company accounts')
      return
    }

    if (profile.account_type === 'organization' && !profile.organization_name?.trim()) {
      setMessage('Organization name is required for organization accounts')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile)
      })

      if (response.ok) {
        setMessage('Profile updated successfully!')
        setTimeout(() => {
          router.push('/profile/complete')
        }, 1500)
      } else {
        const errorData = await response.json()
        setMessage(`Error: ${errorData.error || 'Failed to update profile'}`)
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Edit Profile</h1>
          <p className="text-gray-400">Update your personal information and account details</p>
        </div>

        {/* Profile Form */}
        <div className="card max-w-2xl mx-auto">
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={profile.first_name}
                    onChange={(e) => updateProfile('first_name', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={profile.last_name}
                    onChange={(e) => updateProfile('last_name', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => updateProfile('phone', e.target.value)}
                  className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            {/* Account Type */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Account Type</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="account_type"
                    value="individual"
                    checked={profile.account_type === 'individual'}
                    onChange={(e) => updateProfile('account_type', e.target.value)}
                    className="mr-3 text-gridhealth-500 focus:ring-gridhealth-500"
                  />
                  <span className="text-gray-300">Individual Account</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="account_type"
                    value="organization"
                    checked={profile.account_type === 'organization'}
                    onChange={(e) => updateProfile('account_type', e.target.value)}
                    className="mr-3 text-gridhealth-500 focus:ring-gridhealth-500"
                  />
                  <span className="text-gray-300">Organization Account</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="account_type"
                    value="company"
                    checked={profile.account_type === 'company'}
                    onChange={(e) => updateProfile('account_type', e.target.value)}
                    className="mr-3 text-gridhealth-500 focus:ring-gridhealth-500"
                  />
                  <span className="text-gray-300">Company Account</span>
                </label>
              </div>
            </div>

            {/* Company/Organization Details */}
            {(profile.account_type === 'company' || profile.account_type === 'organization') && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {profile.account_type === 'company' ? 'Company' : 'Organization'} Details
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {profile.account_type === 'company' ? 'Company' : 'Organization'} Name *
                  </label>
                  <input
                    type="text"
                    value={profile.account_type === 'company' ? profile.company_name : profile.organization_name}
                    onChange={(e) => {
                      if (profile.account_type === 'company') {
                        updateProfile('company_name', e.target.value)
                      } else {
                        updateProfile('organization_name', e.target.value)
                      }
                    }}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                    placeholder={`Enter ${profile.account_type === 'company' ? 'company' : 'organization'} name`}
                  />
                </div>
              </div>
            )}

            {/* Organization/Company Details */}
            {(profile.account_type === 'organization' || profile.account_type === 'company') && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">
                  {profile.account_type === 'organization' ? 'Organization' : 'Company'} Details
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {profile.account_type === 'organization' ? 'Organization' : 'Company'} Name *
                  </label>
                  <input
                    type="text"
                    value={profile.account_type === 'organization' ? profile.organization_name : profile.company_name}
                    onChange={(e) => {
                      if (profile.account_type === 'organization') {
                        updateProfile('organization_name', e.target.value)
                      } else {
                        updateProfile('company_name', e.target.value)
                      }
                    }}
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                    placeholder={`Enter ${profile.account_type === 'organization' ? 'organization' : 'company'} name`}
                  />
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('Error') ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'
              }`}>
                {message}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4 pt-6">
              <Link
                href="/dashboard"
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg text-center transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={saveProfile}
                disabled={isLoading}
                className="flex-1 bg-gridhealth-600 hover:bg-gridhealth-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 