'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PricingPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [deviceQuantity, setDeviceQuantity] = useState(1)
  const [billingCycle, setBillingCycle] = useState<'quarterly' | 'annual'>('quarterly')
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  const billingOptions = {
    quarterly: {
      name: 'Quarterly',
      price: 15,
      interval: 'every 3 months',
      description: 'Pay every quarter',
      savings: null
    },
    annual: {
      name: 'Annual',
      price: 11,
      interval: 'every 12 months',
      description: 'Pay yearly (4 quarters)',
      savings: 'Save 27%'
    }
  }

  useEffect(() => {
    if (user) {
      checkUserProfile()
    }
  }, [user])

  const checkUserProfile = async () => {
    try {
      setIsLoadingProfile(true)
      const response = await fetch('/api/user/role')
      if (response.ok) {
        const profile = await response.json()
        setUserProfile(profile)
      }
    } catch (error) {
      console.error('Error checking user profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handlePurchase = async () => {
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
    try {
      setIsLoadingProfile(true)
      
      const response = await fetch('/api/licenses/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          devices: deviceQuantity,
          billingCycle: billingCycle
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const data = await response.json()
      
      if (data.success && data.sessionId) {
        // Redirect to Stripe checkout
        window.location.href = data.checkoutUrl
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error: unknown) {
      console.error('Purchase error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Purchase failed: ${errorMessage}`)
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const getButtonText = () => {
    if (!isLoaded) return 'Loading...'
    if (!user) return 'Sign Up to Purchase'
    if (isLoadingProfile) return 'Checking Profile...'
    if (!userProfile?.isComplete) return 'Complete Profile to Purchase'
    
    const option = billingOptions[billingCycle]
    const totalPrice = option.price * deviceQuantity
    return `Purchase ${deviceQuantity} Device${deviceQuantity > 1 ? 's' : ''} - MYR ${totalPrice}`
  }

  const getButtonDisabled = () => {
    return !isLoaded || isLoadingProfile
  }

  const calculateSavings = () => {
    if (billingCycle === 'annual') {
      const quarterlyTotal = billingOptions.quarterly.price * deviceQuantity * 4 // 4 quarters
      const annualTotal = billingOptions.annual.price * deviceQuantity * 4 // Annual pricing for 4 quarters
      return quarterlyTotal - annualTotal
    }
    return 0
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
              Simple, <span className="gradient-text">Flexible</span> Pricing
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Choose your billing cycle and save more with annual payments. Monitor your systems with GridHealth.
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

      {/* Pricing Section */}
      <section className="py-20 bg-dark-800/50 relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Billing Cycle Toggle */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-8">Choose Your Billing Cycle</h2>
            <div className="inline-flex bg-dark-700 rounded-lg p-1">
              <button
                onClick={() => setBillingCycle('quarterly')}
                className={`px-6 py-3 rounded-md font-medium transition-all ${
                  billingCycle === 'quarterly'
                    ? 'bg-gridhealth-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Quarterly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-3 rounded-md font-medium transition-all relative ${
                  billingCycle === 'annual'
                    ? 'bg-gridhealth-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Annual
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  Save 27%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="card-hover text-center group max-w-lg mx-auto">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-gridhealth-500 to-primary-500 text-white text-xs font-bold px-4 py-2 rounded-full">
                {billingOptions[billingCycle].savings || 'FLEXIBLE PRICING'}
              </div>
            </div>
            
            <div className="mb-8 pt-4">
              <h3 className="text-3xl font-bold text-white mb-4">GridHealth Monitoring</h3>
              <div className="text-5xl font-bold text-gridhealth-400 mb-2">
                MYR {billingOptions[billingCycle].price}
              </div>
              <div className="text-gray-400 text-lg">per device {billingOptions[billingCycle].interval}</div>
              <div className="text-sm text-gray-500 mt-2">{billingOptions[billingCycle].description}</div>
              
              {billingCycle === 'annual' && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                  <div className="text-green-400 font-semibold">
                    💰 Save MYR {calculateSavings()} per year with {deviceQuantity} device{deviceQuantity > 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-green-300">
                    vs. quarterly billing (MYR {billingOptions.quarterly.price * deviceQuantity * 4}/year)
                  </div>
                </div>
              )}
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
                <div className="bg-dark-700 px-6 py-3 rounded-lg">
                  <span className="text-2xl font-bold text-white">{deviceQuantity}</span>
                </div>
                <button
                  onClick={() => setDeviceQuantity(deviceQuantity + 1)}
                  className="w-10 h-10 bg-dark-700 hover:bg-dark-600 rounded-full flex items-center justify-center text-white font-bold transition-colors"
                >
                  +
                </button>
              </div>
              <div className="mt-4 text-gray-400">
                Total: <span className="text-white font-bold text-xl">
                  MYR {billingOptions[billingCycle].price * deviceQuantity}
                </span> {billingOptions[billingCycle].interval}
              </div>
            </div>

            {/* Features */}
            <div className="text-left mb-8 space-y-3">
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
                <span className="text-gray-200">Health score calculations</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-200">Device management dashboard</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-200">Easy cancellation anytime</span>
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
                Choose between quarterly (MYR 15 per device every 3 months) or annual billing (MYR 11 per device every 12 months). 
                Annual billing saves you 27% compared to quarterly payments.
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">Can I change my billing cycle?</h3>
              <p className="text-gray-300">
                Yes, you can switch between quarterly and annual billing at any time. Changes will take effect at your next billing cycle.
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">What happens if I need more devices?</h3>
              <p className="text-gray-300">
                You can easily add more devices to your subscription. Additional devices will be prorated based on your current billing cycle.
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">Is there a free trial?</h3>
              <p className="text-gray-300">
                We offer a 14-day free trial for new users. No credit card required - just sign up and start monitoring your systems.
              </p>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-3">Can I cancel anytime?</h3>
              <p className="text-gray-300">
                Absolutely! You can cancel your subscription at any time. Your monitoring will continue until the end of your current billing period.
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