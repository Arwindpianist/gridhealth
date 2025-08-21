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
  subscription_tier?: string
}

interface AgentVersion {
  version: string
  downloadUrl: string
  fileName: string
  fileSize: number
  releaseDate: string
  releaseNotes: string
  downloadCount: number
  githubUrl: string
}

export default function DownloadPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [licenses, setLicenses] = useState<License[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [agentVersion, setAgentVersion] = useState<AgentVersion | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)
  const [showLicenseKey, setShowLicenseKey] = useState(false)

  // Add meta tags for this page
  useEffect(() => {
    // Update document title and meta tags for this page
    const title = agentVersion 
      ? `Download GridHealth Agent ${agentVersion.version} - Enterprise System Health Monitoring`
      : 'Download GridHealth Agent - Enterprise System Health Monitoring'
    
    document.title = title
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      const description = agentVersion
        ? `Download GridHealth Agent ${agentVersion.version} - Professional system health monitoring for Windows. Real-time monitoring, configurable scans, and enterprise-grade features.`
        : 'Download GridHealth Agent - Professional system health monitoring for Windows. Real-time monitoring, configurable scans, and enterprise-grade features.'
      metaDescription.setAttribute('content', description)
    }
    
    // Add Open Graph meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', title)
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]')
    if (ogDescription) {
      ogDescription.setAttribute('content', metaDescription?.getAttribute('content') || '')
    }
    
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) {
      ogUrl.setAttribute('content', 'https://gridhealth.arwindpianist.store/download')
    }
  }, [agentVersion])

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserData()
      fetchAgentVersion()
    } else if (isLoaded && !user) {
      router.push('/login')
    }
  }, [isLoaded, user, router])

  const fetchUserData = async () => {
    try {
      const response = await fetch('/api/licenses')
      
      if (response.ok) {
        const data = await response.json()
        setLicenses(data.licenses || [])
        setOrganization(data.organization)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const fetchAgentVersion = async () => {
    try {
      console.log('Fetching agent version...')
      const response = await fetch('/api/agent/version')
      console.log('Agent version response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Agent version data received:', data)
        setAgentVersion(data.latest)
      } else {
        console.error('Agent version API error:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error response:', errorText)
      }
    } catch (error) {
      console.error('Error fetching agent version:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const downloadAgent = (license: License) => {
    setSelectedLicense(license)
    setShowLicenseKey(true)
  }

  const downloadAgentForIndividual = () => {
    // Individual users can download without a license
    downloadAgentFile()
  }

  const downloadAgentFile = () => {
    console.log('downloadAgentFile called, agentVersion:', agentVersion)
    
    if (!agentVersion) {
      console.error('No agent version available for download')
      alert('No agent version information available. Please refresh the page.')
      return
    }
    
    // Download directly from GitHub releases
    const downloadUrl = agentVersion.downloadUrl
    console.log('Download URL:', downloadUrl)
    console.log('File name:', agentVersion.fileName)
    
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = agentVersion.fileName
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    console.log('Download initiated from GitHub')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "GridHealth Agent",
            "version": agentVersion?.version || "Latest",
            "description": "Professional system health monitoring for Windows workstations and servers",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Windows",
            "downloadUrl": agentVersion ? `https://gridhealth.arwindpianist.store${agentVersion.downloadUrl}` : "https://gridhealth.arwindpianist.store/download",
            "softwareVersion": agentVersion?.version || "Latest",
            "releaseNotes": agentVersion?.releaseNotes || "Professional system health monitoring agent",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "author": {
              "@type": "Organization",
              "name": "GridHealth"
            }
          })
        }}
      />
      
      <div className="min-h-screen bg-dark-900">
        {/* Header */}
        <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Download GridHealth Agent {agentVersion?.version && `(${agentVersion.version})`}
              </h1>
              <p className="text-dark-300">Get the enterprise-grade system monitoring agent</p>
            </div>
            <div className="flex space-x-4">
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
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">GridHealth Monitoring Agent</h2>
          <p className="text-xl text-dark-300 max-w-3xl mx-auto">
            Professional-grade system health monitoring for Windows workstations and servers. 
            Monitor CPU, memory, disk, network, and service health in real-time.
          </p>
          {agentVersion && (
            <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded-lg inline-block">
              <p className="text-blue-200 text-sm">
                <strong>Latest Version:</strong> {agentVersion.version} • 
                <strong>Released:</strong> {new Date(agentVersion.releaseDate).toLocaleDateString()} • 
                <strong>Size:</strong> {(agentVersion.fileSize / (1024 * 1024)).toFixed(1)} MB
                {agentVersion.downloadCount > 0 && (
                  <> • <strong>Downloads:</strong> {agentVersion.downloadCount.toLocaleString()}</>
                )}
              </p>
              <div className="mt-2 flex space-x-2">
                <a
                  href={agentVersion.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-300 hover:text-blue-100 text-xs underline"
                >
                  View on GitHub
                </a>
                <span className="text-blue-400 text-xs">•</span>
                <span className="text-blue-300 text-xs">
                  Source: {agentVersion.downloadUrl.includes('github.com') ? 'GitHub Releases' : 'Direct Download'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="p-2 bg-blue-600 rounded-lg w-fit mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Monitoring</h3>
            <p className="text-dark-300 text-sm">
              Online status updates every 2 minutes + configurable health scan frequencies (Daily, Weekly, Monthly).
            </p>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="p-2 bg-green-600 rounded-lg w-fit mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Health Scoring</h3>
            <p className="text-dark-300 text-sm">
              Intelligent health scoring system that evaluates overall system performance and alerts on issues.
            </p>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="p-2 bg-purple-600 rounded-lg w-fit mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Performance Metrics</h3>
            <p className="text-dark-300 text-sm">
              Comprehensive collection of CPU, memory, disk, network, and service performance data.
            </p>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="p-2 bg-yellow-600 rounded-lg w-fit mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Secure Communication</h3>
            <p className="text-dark-300 text-sm">
              Encrypted communication with license key authentication and secure API endpoints.
            </p>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="p-2 bg-indigo-600 rounded-lg w-fit mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Easy Configuration</h3>
            <p className="text-dark-300 text-sm">
              Simple GUI interface for license key setup, scan frequency configuration, and monitoring control.
            </p>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="p-2 bg-red-600 rounded-lg w-fit mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Centralized Dashboard</h3>
            <p className="text-dark-300 text-sm">
              View all your devices, health metrics, and alerts from a single web dashboard.
            </p>
          </div>
        </div>

        {/* Download Section */}
        <div className="bg-dark-800 rounded-lg border border-dark-700 mb-8">
          <div className="px-6 py-4 border-b border-dark-700">
            <h2 className="text-xl font-semibold text-white">Download & Install</h2>
            <p className="text-dark-300">Choose your license and download the agent</p>
          </div>
          <div className="p-6">
            {licenses.length === 0 && organization?.subscription_tier !== 'individual' ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-dark-300">No licenses available</h3>
                <p className="mt-1 text-sm text-dark-400">You need a license to download the GridHealth agent.</p>
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
              <div className="space-y-4">
                {/* Show individual user download option */}
                {organization?.subscription_tier === 'individual' && (
                  <div className="p-4 bg-green-900 border border-green-700 rounded-lg">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-white mb-2">🎉 Individual User Account</h3>
                      <p className="text-dark-300 mb-4">You can download the GridHealth Agent for free with up to 3 devices.</p>
                      <button
                        onClick={downloadAgentForIndividual}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        Download {agentVersion?.version || 'Latest'} (Free)
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Show organization licenses */}
                {licenses.map((license) => (
                  <div key={license.id} className="flex items-center justify-between p-4 bg-dark-700 rounded-lg border border-dark-600">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{license.tier} License</h3>
                      <p className="text-dark-300">Device limit: {license.device_limit} devices</p>
                      <p className="text-dark-400 text-sm">Expires: {new Date(license.expires_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => downloadAgent(license)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                      >
                        Download {agentVersion?.version || 'Latest'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Fallback download section when no agent version is available */}
            {!agentVersion && (
              <div className="mt-6 p-4 bg-yellow-900 border border-yellow-700 rounded-lg">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-yellow-200 mb-2">⚠️ Agent Version Information Unavailable</h3>
                  <p className="text-yellow-300 mb-4">
                    Unable to fetch the latest agent version information. You can still download the agent manually.
                  </p>
                  <div className="space-y-2">
                    <p className="text-yellow-200 text-sm">
                      <strong>Latest Version:</strong> v1.0.1 (Fixed license validation)
                    </p>
                    <p className="text-yellow-200 text-sm">
                      <strong>File Size:</strong> ~73 MB
                    </p>
                    <p className="text-yellow-200 text-sm">
                      <strong>Release Date:</strong> August 21, 2025
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const downloadUrl = 'https://gridhealth.arwindpianist.store/api/download/agent/v1.0.1'
                      const a = document.createElement('a')
                      a.href = downloadUrl
                      a.download = 'GridHealth-Agent-v1.0.1.zip'
                      a.target = '_blank'
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                    }}
                    className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Download v1.0.1 (Fallback)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-dark-800 rounded-lg border border-dark-700 mb-8">
          <div className="px-6 py-4 border-b border-dark-700">
            <h2 className="text-xl font-semibold text-white">Installation Instructions</h2>
            <p className="text-dark-300">Follow these steps to get your GridHealth agent running</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Windows Installation</h3>
                <ol className="space-y-3 text-dark-300">
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
                    <span>Download the {agentVersion?.fileName || 'GridHealth-Agent.zip'} package</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
                    <span>Extract the ZIP file to a folder</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
                    <span>Right-click install.bat and "Run as Administrator"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">4</span>
                    <span>Follow the installation prompts</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">5</span>
                    <span>Right-click the system tray icon to configure</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">6</span>
                    <span>Enter your license key and scan frequency</span>
                  </li>
                </ol>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
                <div className="space-y-3 text-dark-300">
                  <div className="flex items-start">
                    <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                    <span>License key validation</span>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                    <span>Scan frequency selection (Daily/Weekly/Monthly)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                    <span>Automatic device ID generation</span>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                    <span>Real-time health monitoring</span>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">✓</span>
                    <span>Secure API communication</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Requirements */}
        <div className="bg-dark-800 rounded-lg border border-dark-700">
          <div className="px-6 py-4 border-b border-dark-700">
            <h2 className="text-xl font-semibold text-white">System Requirements</h2>
            <p className="text-dark-300">Ensure your system meets these requirements</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Minimum Requirements</h3>
                <ul className="space-y-2 text-dark-300">
                  <li>• Windows 10 or Windows Server 2016+</li>
                  <li>• 2GB RAM</li>
                  <li>• 100MB free disk space</li>
                  <li>• .NET 8.0 Runtime (included)</li>
                  <li>• Internet connection for API communication</li>
                  <li>• Administrator privileges for installation</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Recommended</h3>
                <ul className="space-y-2 text-dark-300">
                  <li>• Windows 11 or Windows Server 2022</li>
                  <li>• 4GB RAM or more</li>
                  <li>• 500MB free disk space</li>
                  <li>• Administrator privileges for installation</li>
                  <li>• Stable internet connection</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* License Key Modal */}
      {showLicenseKey && selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Your License Key</h3>
            <p className="text-dark-300 mb-4">
              Use this license key when configuring your GridHealth agent:
            </p>
            
            <div className="bg-dark-700 p-4 rounded-lg mb-6">
              <p className="text-white font-mono text-center break-all">{selectedLicense.license_key}</p>
            </div>

            <div className="mb-6">
              <p className="text-sm text-dark-300">
                <strong>Important:</strong> Keep this license key secure. You'll need it during agent installation.
              </p>
            </div>

            <div className="mb-4 p-4 bg-green-900 border border-green-700 rounded-lg">
              <h4 className="text-green-400 font-semibold mb-2">🎉 GridHealth Agent {agentVersion?.version || 'Latest'} Released!</h4>
              <p className="text-green-300 text-sm">
                Download the complete agent package with professional installer, system tray application, 
                and real-time monitoring capabilities. {agentVersion?.releaseNotes && `Latest update: ${agentVersion.releaseNotes}`}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowLicenseKey(false)}
                className="flex-1 bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={downloadAgentFile}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Download Agent {agentVersion?.version || 'Latest'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      </>
  )
} 