'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface License {
  id: string
  license_key: string
  device_limit: number
  price_myr: number
  status: string
  tier: string
  expires_at: string
  created_at: string
}

interface Organization {
  id: string
  name: string
  subscription_status: string
  subscription_tier: string
  device_limit: number
}

export default function LicensesPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)
  const [additionalDevices, setAdditionalDevices] = useState(10)

  useEffect(() => {
    if (isLoaded && user) {
      fetchLicenses()
    } else if (isLoaded && !user) {
      router.push('/login')
    }
  }, [isLoaded, user, router])

  const fetchLicenses = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/licenses')
      
      if (!response.ok) {
        throw new Error('Failed to fetch licenses')
      }

      const data = await response.json()
      setLicenses(data.licenses || [])
      setOrganization(data.organization)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch licenses')
    } finally {
      setIsLoading(false)
    }
  }

  const downloadLicense = (license: License) => {
    const content = `GridHealth License
=================
License Key: ${license.license_key}
Device Limit: ${license.device_limit}
Tier: ${license.tier}
Price: MYR ${license.price_myr}
Expires: ${new Date(license.expires_at).toLocaleDateString()}
Created: ${new Date(license.created_at).toLocaleDateString()}
Organization: ${organization?.name || 'N/A'}

This license allows you to monitor up to ${license.device_limit} devices using the GridHealth agent.
Download the agent from: https://gridhealth.arwindpianist.store/download

For support, contact: support@gridhealth.arwindpianist.store`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gridhealth-license-${license.license_key}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const downloadLicenseJSON = (license: License) => {
    const licenseData = {
      license_key: license.license_key,
      device_limit: license.device_limit,
      tier: license.tier,
      price_myr: license.price_myr,
      expires_at: license.expires_at,
      created_at: license.created_at,
      organization: organization?.name || 'N/A'
    }

    const content = JSON.stringify(licenseData, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gridhealth-license-${license.license_key}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const openUpgradeModal = (license: License) => {
    setSelectedLicense(license)
    setShowUpgradeModal(true)
  }

  const closeUpgradeModal = () => {
    setShowUpgradeModal(false)
    setSelectedLicense(null)
    setAdditionalDevices(10)
  }

  const handleUpgrade = async () => {
    if (!selectedLicense) return

    try {
      // TODO: Implement upgrade logic
      // This would typically involve:
      // 1. Creating a Stripe checkout session
      // 2. Updating the license in the database
      // 3. Refreshing the licenses list
      
      alert(`Upgrade functionality will be implemented soon. You selected to add ${additionalDevices} devices to license ${selectedLicense.license_key}`)
      closeUpgradeModal()
    } catch (error) {
      console.error('Error upgrading license:', error)
      alert('Failed to upgrade license. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-white mt-4">Loading licenses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Error Loading Licenses</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={fetchLicenses}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">License Management</h1>
              <p className="text-dark-300">Manage your GridHealth monitoring licenses</p>
            </div>
            <div className="flex space-x-4">
              <Link 
                href="/pricing" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Purchase New License
              </Link>
              <Link 
                href="/dashboard" 
                className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Organization Info */}
        {organization && (
          <div className="bg-dark-800 rounded-lg border border-dark-700 mb-8">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Organization Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-dark-300">Organization Name</label>
                  <p className="text-white font-semibold">{organization.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300">Subscription Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    organization.subscription_status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {organization.subscription_status}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300">Total Device Limit</label>
                  <p className="text-white font-semibold">{organization.device_limit}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Licenses List */}
        <div className="bg-dark-800 rounded-lg border border-dark-700">
          <div className="px-6 py-4 border-b border-dark-700">
            <h2 className="text-xl font-semibold text-white">Your Licenses</h2>
            <p className="text-dark-300">Manage and download your GridHealth monitoring licenses</p>
          </div>
          <div className="p-6">
            {licenses.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-dark-300">No licenses yet</h3>
                <p className="mt-1 text-sm text-dark-400">Get started by purchasing your first GridHealth monitoring license.</p>
                <div className="mt-6">
                  <Link 
                    href="/pricing" 
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Purchase License
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {licenses.map((license) => (
                  <div key={license.id} className="bg-dark-700 rounded-lg p-6 border border-dark-600">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-4">
                          <h3 className="text-lg font-semibold text-white">{license.tier} License</h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            license.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {license.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="text-sm font-medium text-dark-300">License Key</label>
                            <p className="text-white font-mono text-sm">{license.license_key}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-dark-300">Device Limit</label>
                            <p className="text-white font-semibold">{license.device_limit} devices</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-dark-300">Expires</label>
                            <p className="text-white">{new Date(license.expires_at).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex space-x-3">
                          <button
                            onClick={() => downloadLicense(license)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            Download as Text
                          </button>
                          <button
                            onClick={() => downloadLicenseJSON(license)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            Download as JSON
                          </button>
                          <button
                            onClick={() => openUpgradeModal(license)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                          >
                            Upgrade License
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-dark-800 rounded-lg border border-dark-700 mt-8">
          <div className="px-6 py-4 border-b border-dark-700">
            <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
            <p className="text-dark-300">Get started with GridHealth monitoring</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link 
                href="/download" 
                className="flex items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="p-2 bg-blue-600 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Download Agent</h3>
                  <p className="text-sm text-dark-400">Get the GridHealth monitoring agent</p>
                </div>
              </Link>

              <Link 
                href="/pricing" 
                className="flex items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="p-2 bg-green-600 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Purchase License</h3>
                  <p className="text-sm text-dark-400">Buy a new monitoring license</p>
                </div>
              </Link>

              <Link 
                href="/dashboard" 
                className="flex items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="p-2 bg-purple-600 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">View Dashboard</h3>
                  <p className="text-sm text-dark-400">Monitor your devices and health</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Upgrade License</h3>
            <p className="text-dark-300 mb-4">
              Add more devices to your existing license: <strong>{selectedLicense.license_key}</strong>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Additional Devices
              </label>
              <select
                value={additionalDevices}
                onChange={(e) => setAdditionalDevices(Number(e.target.value))}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
              >
                <option value={10}>10 devices</option>
                <option value={25}>25 devices</option>
                <option value={50}>50 devices</option>
                <option value={100}>100 devices</option>
                <option value={250}>250 devices</option>
                <option value={500}>500 devices</option>
              </select>
            </div>

            <div className="mb-6">
              <p className="text-sm text-dark-300">
                Current limit: <strong>{selectedLicense.device_limit}</strong> devices<br />
                New limit: <strong>{selectedLicense.device_limit + additionalDevices}</strong> devices
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeUpgradeModal}
                className="flex-1 bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Upgrade License
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 