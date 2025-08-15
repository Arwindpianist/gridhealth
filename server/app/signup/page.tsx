'use client'

import React, { useState } from 'react'
import Link from 'next/link'

export default function SignupPage() {
  const [userType, setUserType] = useState<'individual' | 'organization' | 'company'>('individual')

  return (
    <div className="min-h-screen bg-dark-900 py-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            Join <span className="gradient-text">GridHealth</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Choose your account type and start monitoring your systems with enterprise-grade reliability
          </p>
        </div>

        {/* User Type Selection */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <button
            onClick={() => setUserType('individual')}
            className={`px-8 py-4 rounded-xl font-medium transition-all duration-200 ${
              userType === 'individual'
                ? 'bg-gridhealth-600 text-white shadow-lg'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            👤 Individual
          </button>
          <button
            onClick={() => setUserType('organization')}
            className={`px-8 py-4 rounded-xl font-medium transition-all duration-200 ${
              userType === 'organization'
                ? 'bg-gridhealth-600 text-white shadow-lg'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            🏢 Organization
          </button>
          <button
            onClick={() => setUserType('company')}
            className={`px-8 py-4 rounded-xl font-medium transition-all duration-200 ${
              userType === 'company'
                ? 'bg-gridhealth-600 text-white shadow-lg'
                : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
            }`}
          >
            🏢 System Integrator
          </button>
        </div>

        {/* Signup Form */}
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {userType === 'individual' && 'Individual Account'}
              {userType === 'organization' && 'Organization Account'}
              {userType === 'company' && 'System Integrator Account'}
            </h2>

            <div className="space-y-6">
              {/* Personal Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gridhealth-500 focus:border-transparent"
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gridhealth-500 focus:border-transparent"
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              {/* Organization/Company Name */}
              {(userType === 'organization' || userType === 'company') && (
                <div>
                  <label htmlFor="entityName" className="block text-sm font-medium text-gray-300 mb-2">
                    {userType === 'organization' ? 'Organization Name' : 'Company Name'}
                  </label>
                  <input
                    type="text"
                    id="entityName"
                    name="entityName"
                    required
                    className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gridhealth-500 focus:border-transparent"
                    placeholder={`Enter your ${userType === 'organization' ? 'organization' : 'company'} name`}
                  />
                </div>
              )}

              {/* Contact Information */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gridhealth-500 focus:border-transparent"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gridhealth-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gridhealth-500 focus:border-transparent"
                  placeholder="Create a strong password"
                />
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="terms"
                  name="terms"
                  required
                  className="w-4 h-4 mt-1 text-gridhealth-600 bg-dark-700 border-dark-600 rounded focus:ring-gridhealth-500 focus:ring-2"
                />
                <label htmlFor="terms" className="ml-2 text-sm text-gray-300">
                  I agree to the{' '}
                  <Link href="/terms" className="text-gridhealth-400 hover:text-gridhealth-300">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-gridhealth-400 hover:text-gridhealth-300">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full btn-primary py-4 text-lg font-semibold"
              >
                Create Account
              </button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-gray-400">
                  Already have an account?{' '}
                  <Link href="/login" className="text-gridhealth-400 hover:text-gridhealth-300 font-medium">
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 