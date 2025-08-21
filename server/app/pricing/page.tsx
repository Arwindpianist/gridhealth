'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserProfile {
  first_name: string
  last_name: string
  account_type: string
  isComplete: boolean
}

export default function PricingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [deviceQuantity, setDeviceQuantity] = useState(1)

  useEffect(() => {
    if (isLoaded && user) {
      checkUserProfile()
    }
  }, [isLoaded, user])

  const checkUserProfile = async () => {
    setIsLoadingProfile(true)
    try {
      const response = await fetch('/api/user/role')
      if (response.ok) {
        const data = await response.json()
        const profile: UserProfile = {
          first_name: data.user?.first_name || '',
          last_name: data.user?.last_name || '',
          account_type: data.userRole?.role || 'unknown',
          isComplete: !!(data.user?.first_name && data.user?.last_name && data.userRole?.role)
        }
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error checking user profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handlePurchase = () => {
    if (!user) {
      // Not signed in - redirect to signup
      router.push('/signup')
      return
    }

    if (!userProfile?.isComplete) {
      // Profile not complete - redirect to profile completion
      router.push('/profile')
      return
    }

    // User is signed in and profile is complete - proceed to purchase
    router.push(`/api/licenses/purchase?devices=${deviceQuantity}`)
  }

  const getButtonText = () => {
    if (!isLoaded) return 'Loading...'
    if (!user) return 'Sign Up to Purchase'
    if (isLoadingProfile) return 'Checking Profile...'
    if (!userProfile?.isComplete) return 'Complete Profile to Purchase'
    return `Purchase ${deviceQuantity} Device${deviceQuantity > 1 ? 's' : ''}`
  }

  const getButtonDisabled = () => {
    return !isLoaded || isLoadingProfile
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-gridhealth-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Simple, <span className="gradient-text">Transparent</span> Pricing
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Monitor your systems with GridHealth. Pay only for the devices you monitor - no hidden fees, no surprises.
            </p>
          </div>
        </div>
      </section>

      {/* User Status Banner */}
      {user && (
        <section className="py-4 bg-dark-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {isLoadingProfile ? (
                <p className="text-gray-400">Checking your profile...</p>
              ) : userProfile?.isComplete ? (
                <p className="text-green-400">
                  ✅ Welcome back, {userProfile.first_name}! Your profile is complete and ready for purchase.
                </p>
              ) : (
                <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-4">
                  <p className="text-amber-400">
                    ⚠️ Please complete your profile before purchasing licenses.
                  </p>
                  <Link href="/profile" className="text-amber-300 underline hover:text-amber-200">
                    Complete Profile →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Single Pricing Plan */}
      <section className="py-20 bg-dark-800/50 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card-hover text-center group max-w-lg mx-auto">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-gridhealth-500 to-primary-500 text-white text-xs font-bold px-4 py-2 rounded-full">
                SIMPLE PRICING
              </div>
            </div>
            
            <div className="mb-8 pt-4">
              <h3 className="text-3xl font-bold text-white mb-4">GridHealth Monitoring</h3>
              <div className="text-5xl font-bold text-gridhealth-400 mb-2">
                MYR 11
              </div>
              <div className="text-gray-400 text-lg">per device per 3 months</div>
              <div className="text-sm text-gray-500 mt-2">Scales with your needs</div>
            </div>

            {/* Device Quantity Selector */}
            <div className="mb-8">
              <label className="block text-white font-semibold mb-4">How many devices?</label>
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setDeviceQuantity(Math.max(1, deviceQuantity - 1))}
                  className="w-10 h-10 bg-dark-700 hover:bg-dark-600 rounded-full flex items-center justify-center text-white font-bold transition-colors"
                >
                  -
                </button>
                <div className="text-2xl font-bold text-white min-w-[60px]">
                  {deviceQuantity}
                </div>
                <button
                  onClick={() => setDeviceQuantity(deviceQuantity + 1)}
                  className="w-10 h-10 bg-dark-700 hover:bg-dark-600 rounded-full flex items-center justify-center text-white font-bold transition-colors"
                >
                  +
                </button>
              </div>
              <div className="mt-4 text-2xl font-bold text-gridhealth-400">
                Total: MYR {deviceQuantity * 11}
              </div>
              <div className="text-gray-400">for 3 months of monitoring</div>
            </div>
            
            <div className="space-y-4 mb-8 text-left">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-200">Real-time system monitoring</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-200">CPU, Memory, Disk & Network tracking</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-200">Health score calculation</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-200">Web-based dashboard</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-200">Easy agent installation</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-200">No setup fees or hidden costs</span>
              </div>
            </div>
            
            <button
              onClick={handlePurchase}
              disabled={getButtonDisabled()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getButtonText()}
            </button>

            {!user && (
              <p className="text-sm text-gray-400 mt-4">
                Already have an account? <Link href="/login" className="text-gridhealth-400 hover:text-gridhealth-300">Sign in</Link>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              GridHealth provides comprehensive system monitoring for all types of users - individuals, organizations, and companies.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Real-time Monitoring</h3>
              <p className="text-gray-300">
                Monitor CPU, memory, disk usage, and network performance in real-time with automatic data collection.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Health Scoring</h3>
              <p className="text-gray-300">
                Get instant health scores for all your systems, making it easy to identify issues at a glance.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Easy Setup</h3>
              <p className="text-gray-300">
                Simple agent installation with automatic configuration. Start monitoring in minutes, not hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-dark-800/50 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Everything you need to know about GridHealth pricing.
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">How does the pricing work?</h3>
              <p className="text-gray-300">
                Simple - you pay MYR 11 per device for 3 months of monitoring. Add or remove devices anytime, 
                and your license will be updated automatically.
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">Are there any hidden fees?</h3>
              <p className="text-gray-300">
                Absolutely not! The price you see is the price you pay. No setup fees, no monthly charges, 
                no surprise bills - just MYR 11 per device per 3 months.
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">Can I add more devices later?</h3>
              <p className="text-gray-300">
                Yes! You can purchase additional devices at any time. They'll be added to your existing license 
                and extend your monitoring capacity immediately.
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">What payment methods do you accept?</h3>
              <p className="text-gray-300">
                We accept all major credit cards and PayPal through our secure Stripe payment processing. 
                All transactions are encrypted and secure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-dark-800 to-dark-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        <div className="absolute top-10 left-10 w-64 h-64 bg-gridhealth-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Start Monitoring?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join organizations already using GridHealth to monitor their systems. 
            Get started today with transparent, simple pricing.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button
              onClick={handlePurchase}
              disabled={getButtonDisabled()}
              className="btn-primary text-lg px-12 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🚀 {getButtonText()}
            </button>
            <Link href="/download" className="btn-outline text-lg px-12 py-4">
              📥 Download Agent
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
} 