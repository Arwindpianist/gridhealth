'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProfileData {
  account_type: string
  company_name?: string
  organization_name?: string
  first_name: string
  last_name: string
}

export default function ProfileCompletePage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isLoaded && user) {
      loadProfileData()
    }
  }, [isLoaded, user])

  const loadProfileData = async () => {
    try {
      const response = await fetch('/api/onboarding/status')
      if (response.ok) {
        const status = await response.json()
        if (status.user) {
          setProfileData({
            account_type: status.user.account_type || 'individual',
            company_name: status.user.company_name,
            organization_name: status.user.organization_name,
            first_name: status.user.first_name,
            last_name: status.user.last_name
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error)
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gridhealth-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile data...</p>
        </div>
      </div>
    )
  }

  const accountType = profileData?.account_type || 'individual'
  const companyName = profileData?.company_name || profileData?.organization_name

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Profile Completed Successfully!</h1>
          <p className="text-gray-400">
            Welcome, {profileData?.first_name} {profileData?.last_name}!
          </p>
          {companyName && (
            <p className="text-gridhealth-400 font-medium mt-2">
              {accountType === 'company' ? 'Company' : 'Organization'}: {companyName}
            </p>
          )}
        </div>

        {/* Next Steps */}
        <div className="card max-w-2xl mx-auto mb-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-4">What's Next?</h2>
            <p className="text-gray-400 mb-6">
              Your profile is complete! Now let's get you set up with GridHealth monitoring.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center p-4 bg-dark-700 rounded-lg">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">Get Your License</h3>
                <p className="text-gray-400 text-sm">Choose a monitoring plan that fits your needs</p>
              </div>
              <Link 
                href="/pricing" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                View Plans
              </Link>
            </div>

            <div className="flex items-center p-4 bg-dark-700 rounded-lg">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">Download the Agent</h3>
                <p className="text-gray-400 text-sm">Install monitoring software on your systems</p>
              </div>
              <Link 
                href="/download" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Download
              </Link>
            </div>

            <div className="flex items-center p-4 bg-dark-700 rounded-lg">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">Start Monitoring</h3>
                <p className="text-gray-400 text-sm">Begin tracking your system health</p>
              </div>
              <Link 
                href="/dashboard" 
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Account Type Specific Info */}
        {accountType !== 'individual' && (
          <div className="card max-w-2xl mx-auto mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              {accountType === 'company' ? 'Company' : 'Organization'} Account Benefits
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full mt-1"></div>
                <div>
                  <h4 className="text-white font-medium">Multiple Device Monitoring</h4>
                  <p className="text-gray-400 text-sm">Monitor all your company systems from one dashboard</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full mt-1"></div>
                <div>
                  <h4 className="text-white font-medium">Team Access</h4>
                  <p className="text-gray-400 text-sm">Invite team members to help manage monitoring</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full mt-1"></div>
                <div>
                  <h4 className="text-white font-medium">Bulk Licensing</h4>
                  <p className="text-gray-400 text-sm">Purchase licenses for multiple devices at once</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="text-center">
          <div className="flex justify-center space-x-4">
            <Link
              href="/dashboard"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/pricing"
              className="bg-gridhealth-600 hover:bg-gridhealth-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Get Started with License
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 