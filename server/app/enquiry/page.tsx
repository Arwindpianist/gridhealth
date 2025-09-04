'use client'

import React, { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EnquiryPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    organization_name: '',
    contact_person: '',
    email: '',
    phone: '',
    device_count: '',
    use_case: '',
    budget_range: '',
    timeline: '',
    additional_notes: ''
  })

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    router.push('/login')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitSuccess(true)
        setFormData({
          organization_name: '',
          contact_person: '',
          email: '',
          phone: '',
          device_count: '',
          use_case: '',
          budget_range: '',
          timeline: '',
          additional_notes: ''
        })
      } else {
        setError(data.error || 'Failed to submit enquiry')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">Enquiry Submitted Successfully!</h1>
            <p className="text-xl text-gray-300 mb-8">
              Thank you for your interest in GridHealth. We will review your requirements and contact you within 24-48 hours.
            </p>
            <div className="space-y-4">
              <Link 
                href="/dashboard" 
                className="bg-gridhealth-600 hover:bg-gridhealth-700 text-white px-6 py-3 rounded-lg transition-colors inline-block"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Header */}
      <div className="bg-dark-800/80 backdrop-blur-sm border-b border-dark-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                License Enquiry
              </h1>
              <p className="text-dark-300 mt-2">Submit your requirements for GridHealth licensing</p>
            </div>
            <Link
              href="/dashboard"
              className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-dark-800 rounded-2xl border border-dark-700 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Tell us about your requirements</h2>
            <p className="text-gray-300">
              Fill out the form below and we'll get back to you with a custom quote and license setup.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Organization Name *
                </label>
                <input
                  type="text"
                  name="organization_name"
                  value={formData.organization_name}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gridhealth-500"
                  placeholder="Your Company Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gridhealth-500"
                  placeholder="Your Name"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gridhealth-500"
                  placeholder="your.email@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gridhealth-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Devices *
                </label>
                <input
                  type="number"
                  name="device_count"
                  value={formData.device_count}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gridhealth-500"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timeline
                </label>
                <select
                  name="timeline"
                  value={formData.timeline}
                  onChange={handleInputChange}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gridhealth-500"
                >
                  <option value="">Select timeline</option>
                  <option value="immediate">Immediate</option>
                  <option value="1_week">Within 1 week</option>
                  <option value="2_weeks">Within 2 weeks</option>
                  <option value="1_month">Within 1 month</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>

            {/* Budget and Use Case */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Budget Range
                </label>
                <select
                  name="budget_range"
                  value={formData.budget_range}
                  onChange={handleInputChange}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gridhealth-500"
                >
                  <option value="">Select budget range</option>
                  <option value="under_100">Under $100/month</option>
                  <option value="100_500">$100 - $500/month</option>
                  <option value="500_1000">$500 - $1,000/month</option>
                  <option value="1000_5000">$1,000 - $5,000/month</option>
                  <option value="over_5000">Over $5,000/month</option>
                  <option value="custom">Custom pricing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Primary Use Case
                </label>
                <select
                  name="use_case"
                  value={formData.use_case}
                  onChange={handleInputChange}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gridhealth-500"
                >
                  <option value="">Select use case</option>
                  <option value="production_monitoring">Production Server Monitoring</option>
                  <option value="development_testing">Development & Testing</option>
                  <option value="security_compliance">Security & Compliance</option>
                  <option value="performance_optimization">Performance Optimization</option>
                  <option value="disaster_recovery">Disaster Recovery</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                name="additional_notes"
                value={formData.additional_notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-gridhealth-500"
                placeholder="Tell us more about your specific requirements, infrastructure, or any questions you have..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gridhealth-600 hover:bg-gridhealth-700 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg transition-colors font-medium"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
