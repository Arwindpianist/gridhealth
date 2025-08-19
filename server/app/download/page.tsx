'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface License {
  id: string
  license_key: string
  device_limit: number
  tier: string
  status: string
  expires_at: string
}

interface Organization {
  id: string
  name: string
  subscription_status: string
}

export default function DownloadPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)
  const [showLicenseKey, setShowLicenseKey] = useState(false)

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserData()
    } else if (isLoaded && !user) {
      router.push('/login')
    }
  }, [isLoaded, user, router])

  const fetchUserData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/licenses')
      
      if (response.ok) {
        const data = await response.json()
        setLicenses(data.licenses || [])
        setOrganization(data.organization)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadAgent = (license: License) => {
    setSelectedLicense(license)
    setShowLicenseKey(true)
  }

  const downloadAgentFile = () => {
    // Create a simple agent configuration file
    const config = `# GridHealth Agent Configuration
# Generated on: ${new Date().toISOString()}
# License Key: ${selectedLicense?.license_key}
# Organization: ${organization?.name || 'N/A'}

[Agent]
Name = GridHealth-Monitoring-Agent
Version = 1.0.0
LicenseKey = ${selectedLicense?.license_key}
OrganizationId = ${organization?.id || 'N/A'}

[Monitoring]
Interval = 30
Metrics = CPU,Memory,Disk,Network,Services

[API]
Endpoint = https://gridhealth.arwindpianist.store/api/metrics
Timeout = 30

[Logging]
Level = INFO
Path = C:\\ProgramData\\GridHealth\\logs

# Installation Instructions:
# 1. Download the GridHealth-Agent.msi file
# 2. Run the installer as Administrator
# 3. Enter the license key when prompted
# 4. The agent will start monitoring automatically

# For support: support@gridhealth.arwindpianist.store`

    const blob = new Blob([config], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gridhealth-agent-config-${selectedLicense?.license_key}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
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
    return null
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Download <span className="gradient-text">GridHealth Agent</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Monitor your systems in real-time with our lightweight, powerful monitoring agent.
            </p>
          </div>

          {/* License Status */}
          {organization ? (
            <div className="card mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">{organization.name}</h2>
              <p className="text-gray-400 mb-4">
                Status: <span className={`font-semibold ${organization.subscription_status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                  {organization.subscription_status.toUpperCase()}
                </span>
              </p>
              {licenses.length > 0 && (
                <p className="text-gray-300">
                  Active Licenses: <span className="font-semibold text-gridhealth-400">{licenses.length}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="card mb-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Individual Account</h2>
              <p className="text-gray-400 mb-4">
                Status: <span className="font-semibold text-green-400">ACTIVE</span>
              </p>
              <p className="text-gray-300">
                You can monitor up to 3 personal devices for free
              </p>
            </div>
          )}

          {/* Download Options */}
          {licenses.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {licenses.map((license) => (
                <div key={license.id} className="card text-center">
                  <div className="text-3xl mb-4">🔑</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{license.tier.toUpperCase()} License</h3>
                  <div className="text-2xl font-bold text-gridhealth-400 mb-2">{license.device_limit} Devices</div>
                  <div className="text-sm text-gray-400 mb-4">
                    Expires: {new Date(license.expires_at).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => downloadAgent(license)}
                    className="btn-primary w-full py-3"
                  >
                    📥 Download Agent
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12 mb-12">
              <div className="text-6xl mb-6">🔒</div>
              <h2 className="text-2xl font-bold text-white mb-4">No Active Licenses</h2>
              <p className="text-gray-400 mb-6">
                {!organization 
                  ? 'As an individual user, you can download the agent for personal use. Purchase a license to unlock advanced features and monitor more devices.'
                  : 'You need an active license to download the GridHealth agent.'
                }
              </p>
              <div className="space-y-4">
                {!organization && (
                  <button
                    onClick={() => downloadAgent({ 
                      id: 'individual', 
                      license_key: 'INDIVIDUAL-FREE', 
                      device_limit: 3, 
                      tier: 'individual', 
                      status: 'active', 
                      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() 
                    })}
                    className="btn-primary text-lg px-8 py-3 w-full"
                  >
                    📥 Download Agent (Free - 3 Devices)
                  </button>
                )}
                <Link href="/pricing" className="btn-outline text-lg px-8 py-3 w-full block text-center">
                  💳 Purchase License for More Devices
                </Link>
              </div>
            </div>
          )}

          {/* Agent Features */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Agent Features</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-300">Real-time CPU, Memory, Disk monitoring</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-300">Windows Service (auto-start)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-300">Secure HTTPS communication</span>
                </div>
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-gray-300">MSI installer with silent deployment</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">System Requirements</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">OS:</span>
                  <span className="text-white font-medium">Windows 10/11, Server 2016+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">RAM:</span>
                  <span className="text-white font-medium">512MB minimum</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Storage:</span>
                  <span className="text-white font-medium">50MB free space</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Network:</span>
                  <span className="text-white font-medium">HTTPS outbound</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Permissions:</span>
                  <span className="text-white font-medium">Administrator</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* License Key Modal */}
      {showLicenseKey && selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-4">Download GridHealth Agent</h3>
            <p className="text-gray-300 mb-6">
              Your license key is: <span className="font-mono text-gridhealth-400 break-all">{selectedLicense.license_key}</span>
            </p>
            <div className="space-y-3">
              <button
                onClick={downloadAgentFile}
                className="btn-primary w-full py-3"
              >
                📥 Download Configuration
              </button>
              <button
                onClick={() => setShowLicenseKey(false)}
                className="btn-outline w-full py-3"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              The agent installer will be available soon. For now, download the configuration file.
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 