'use client'

import React, { Suspense } from 'react'
import { SignUp } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const accountType = searchParams.get('type') || 'individual'

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center py-20">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Join <span className="gradient-text">GridHealth</span>
          </h1>
          <p className="text-gray-300">
            {accountType === 'individual' && 'Start monitoring your personal devices'}
            {accountType === 'organization' && 'Monitor your organization\'s infrastructure'}
            {accountType === 'company' && 'Provide monitoring services to your clients'}
          </p>
        </div>

        <SignUp 
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-dark-800 border border-dark-700 shadow-2xl",
              headerTitle: "text-2xl font-bold text-white",
              headerSubtitle: "text-gray-300",
              formButtonPrimary: "bg-gradient-to-r from-gridhealth-500 to-primary-500 hover:from-gridhealth-600 hover:to-primary-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200",
              formFieldInput: "bg-dark-700 border-dark-600 text-white placeholder-gray-400 focus:border-gridhealth-500 focus:ring-gridhealth-500",
              formFieldLabel: "text-gray-300",
              footerActionLink: "text-gridhealth-400 hover:text-gridhealth-300",
              dividerLine: "bg-dark-600",
              dividerText: "text-gray-400",
              socialButtonsBlockButton: "bg-dark-700 border-dark-600 text-gray-300 hover:bg-dark-600",
              formFieldInputShowPasswordButton: "text-gray-400 hover:text-gray-300"
            }
          }}
          forceRedirectUrl="/onboarding"
          fallbackRedirectUrl="/onboarding"
        />

        <div className="text-center mt-6">
          <p className="text-gray-400">
            Already have an account?{' '}
            <button 
              onClick={() => router.push('/login')}
              className="text-gridhealth-400 hover:text-gridhealth-300 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-900 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gridhealth-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
} 