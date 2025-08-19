'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

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

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gridhealth-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading licenses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Licenses</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button 
            onClick={fetchLicenses}
            className="btn-primary px-6 py-3"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Your <span className="gradient-text">Licenses</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Manage your GridHealth licenses, download license keys, and monitor your subscription status.
          </p>
        </div>

        {/* Organization Info */}
        {organization && (
          <div className="card mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Organization Information</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="text-gray-400 text-sm mb-1">Organization Name</div>
                <div className="text-white font-semibold">{organization.name}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Subscription Status</div>
                <div className={`font-semibold ${
                  organization.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {organization.subscription_status === 'active' ? '🟢 Active' : '🔴 Inactive'}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm mb-1">Device Limit</div>
                <div className="text-white font-semibold">{organization.device_limit} devices</div>
              </div>
            </div>
          </div>
        )}

        {/* Licenses */}
        <div className="space-y-6">
          {licenses.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">🔑</div>
              <h3 className="text-2xl font-semibold text-white mb-4">No Licenses Found</h3>
              <p className="text-gray-400 mb-6">
                You don't have any active licenses yet. Purchase a license to start monitoring your devices.
              </p>
              <button 
                onClick={() => router.push('/pricing')}
                className="btn-primary px-8 py-3"
              >
                View Pricing
              </button>
            </div>
          ) : (
            licenses.map((license) => (
              <div key={license.id} className="card">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="mb-4 md:mb-0">
                    <div className="flex items-center mb-2">
                      <h3 className="text-xl font-semibold text-white mr-3">
                        {license.tier.charAt(0).toUpperCase() + license.license_key.slice(1)} License
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        license.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {license.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="grid md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">License Key</div>
                        <div className="text-white font-mono bg-dark-800 px-2 py-1 rounded">
                          {license.license_key}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Device Limit</div>
                        <div className="text-white font-semibold">{license.device_limit} devices</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Price</div>
                        <div className="text-white font-semibold">MYR {license.price_myr}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Expires</div>
                        <div className="text-white font-semibold">
                          {new Date(license.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => downloadLicense(license)}
                      className="btn-outline px-4 py-2 text-sm"
                    >
                      📥 Download TXT
                    </button>
                    <button
                      onClick={() => downloadLicenseJSON(license)}
                      className="btn-outline px-4 py-2 text-sm"
                    >
                      📥 Download JSON
                    </button>
                    <button
                      onClick={() => router.push('/download')}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      🖥️ Download Agent
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 text-center">
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <button
              onClick={() => router.push('/download')}
              className="card-hover p-6 text-center group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                🖥️
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Download Agent</h3>
              <p className="text-gray-400 text-sm">
                Get the GridHealth monitoring agent for your devices
              </p>
            </button>
            
            <button
              onClick={() => router.push('/pricing')}
              className="card-hover p-6 text-center group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                💳
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Purchase License</h3>
              <p className="text-gray-400 text-sm">
                Buy additional licenses or upgrade your plan
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 