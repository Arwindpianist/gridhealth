'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserProfile {
  first_name: string
  last_name: string
  phone: string
  account_type: string
  organization_name: string
  company_name: string
  description: string
  address: string
  contact_email: string
  contact_phone: string
}

export default function ProfilePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState<UserProfile>({
    first_name: '',
    last_name: '',
    phone: '',
    account_type: 'individual',
    organization_name: '',
    company_name: '',
    description: '',
    address: '',
    contact_email: '',
    contact_phone: ''
  })
  const [message, setMessage] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (isLoaded && user) {
      loadProfile()
    }
  }, [isLoaded, user])

  const loadProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        
        // Check if user is admin
        if (data.userRole?.role === 'admin') {
          setIsAdmin(true)
        }

        if (data.user) {
          const profileData: UserProfile = {
            first_name: data.user.first_name || '',
            last_name: data.user.last_name || '',
            phone: data.user.phone || '',
            account_type: 'individual', // default
            organization_name: '',
            company_name: '',
            description: '',
            address: '',
            contact_email: '',
            contact_phone: ''
          }

          // Determine account type and populate data based on role
          if (data.userRole) {
            if (data.userRole.role === 'admin') {
              profileData.account_type = 'admin'
            } else if (data.userRole.role === 'individual') {
              profileData.account_type = 'individual'
            } else if (data.userRole.company_id && data.company) {
              profileData.account_type = 'company'
              profileData.company_name = data.company.name || ''
              profileData.address = data.company.address || ''
              profileData.contact_email = data.company.email || ''
              profileData.contact_phone = data.company.phone || ''
            } else if (data.userRole.organization_id && data.organization) {
              // Check if it's a virtual organization for individual users
              if (data.organization.name?.includes('Individual Account')) {
                profileData.account_type = 'individual'
              } else {
                profileData.account_type = 'organization'
                profileData.organization_name = data.organization.name || ''
                profileData.description = data.organization.description || ''
                profileData.address = data.organization.address || ''
                profileData.contact_email = data.organization.contact_email || ''
                profileData.contact_phone = data.organization.contact_phone || ''
              }
            }
          }

          setProfile(profileData)
        }
      } else {
        console.error('Failed to load profile data')
        setMessage('Failed to load profile data')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      setMessage('Error loading profile data')
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }))
    setMessage('') // Clear any existing messages
  }

  const saveProfile = async () => {
    // Comprehensive validation for all required fields
    const errors = []
    
    // Personal information validation
    if (!profile.first_name.trim()) {
      errors.push('First name is required')
    }
    if (!profile.last_name.trim()) {
      errors.push('Last name is required')
    }
    if (!profile.phone.trim()) {
      errors.push('Phone number is required')
    }

    // Account type specific validation
    if (profile.account_type === 'company') {
      if (!profile.company_name?.trim()) {
        errors.push('Company name is required')
      }
      if (!profile.address?.trim()) {
        errors.push('Company address is required')
      }
      if (!profile.contact_email?.trim()) {
        errors.push('Company contact email is required')
      }
      if (!profile.contact_phone?.trim()) {
        errors.push('Company contact phone is required')
      }
    }

    if (profile.account_type === 'organization') {
      if (!profile.organization_name?.trim()) {
        errors.push('Organization name is required')
      }
      if (!profile.description?.trim()) {
        errors.push('Organization description is required')
      }
      if (!profile.address?.trim()) {
        errors.push('Organization address is required')
      }
      if (!profile.contact_email?.trim()) {
        errors.push('Organization contact email is required')
      }
      if (!profile.contact_phone?.trim()) {
        errors.push('Organization contact phone is required')
      }
    }

    if (errors.length > 0) {
      setMessage(`Please complete all required fields: ${errors.join(', ')}`)
      return
    }

    setIsSaving(true)
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
      setIsSaving(false)
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gridhealth-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
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
                  Phone Number *
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
                {/* Only show admin option for admin users */}
                {isAdmin && (
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="account_type"
                      value="admin"
                      checked={profile.account_type === 'admin'}
                      onChange={(e) => updateProfile('account_type', e.target.value)}
                      className="mr-3 text-gridhealth-500 focus:ring-gridhealth-500"
                    />
                    <span className="text-gray-300">Admin Account</span>
                  </label>
                )}
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
                  <span className="text-gray-500">Organization Account</span>
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

            {/* Organization Details */}
            {profile.account_type === 'organization' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Organization Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={profile.organization_name}
                      onChange={(e) => updateProfile('organization_name', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                      placeholder="Enter organization name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={profile.description}
                      onChange={(e) => updateProfile('description', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                      placeholder="Describe your organization"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => updateProfile('address', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                      placeholder="Enter organization address"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Contact Email *
                      </label>
                      <input
                        type="email"
                        value={profile.contact_email}
                        onChange={(e) => updateProfile('contact_email', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                        placeholder="contact@organization.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        value={profile.contact_phone}
                        onChange={(e) => updateProfile('contact_phone', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                        placeholder="Contact phone number"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Company Details */}
            {profile.account_type === 'company' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Company Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={profile.company_name}
                      onChange={(e) => updateProfile('company_name', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                      placeholder="Enter company name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={profile.address}
                      onChange={(e) => updateProfile('address', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                      placeholder="Enter company address"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Contact Email *
                      </label>
                      <input
                        type="email"
                        value={profile.contact_email}
                        onChange={(e) => updateProfile('contact_email', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Contact Phone *
                      </label>
                      <input
                        type="tel"
                        value={profile.contact_phone}
                        onChange={(e) => updateProfile('contact_phone', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:ring-1 focus:ring-gridhealth-500 focus:border-gridhealth-500"
                        placeholder="Contact phone number"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.includes('Error') || message.includes('Failed') 
                  ? 'bg-red-900 text-red-200' 
                  : 'bg-green-900 text-green-200'
              }`}>
                {message}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4 pt-6">
              <Link
                href="/dashboard"
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-center py-3 px-6 rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={saveProfile}
                disabled={isSaving}
                className="flex-1 bg-gridhealth-600 hover:bg-gridhealth-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 