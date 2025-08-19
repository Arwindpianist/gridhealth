'use client'

import React from 'react'
import { SignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center py-20">
      <div className="max-w-md w-full mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome Back to <span className="gradient-text">GridHealth</span>
          </h1>
          <p className="text-gray-300">
            Sign in to access your monitoring dashboard
          </p>
        </div>

        <div className="card p-6">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none",
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
            afterSignInUrl="/dashboard"
            redirectUrl="/dashboard"
          />
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <button 
              onClick={() => router.push('/signup')}
              className="text-gridhealth-400 hover:text-gridhealth-300 font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
} 