'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Enquiry {
  id: number
  organization_name: string
  contact_person: string
  email: string
  device_count: number
  status: string
  created_at: string
  admin_notes?: string
  license_key?: string
  device_limit?: number
  price?: number
  payment_status?: string
}

interface License {
  license_key: string
  organization_name: string
  device_limit: number
  status: string
  payment_status: string
  price: number
  is_blacklisted: boolean
  active_devices: number
  created_at: string
}

export default function LicenseManagementPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'enquiries' | 'licenses' | 'blacklist'>('enquiries')
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null)
  const [showEnquiryModal, setShowEnquiryModal] = useState(false)
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [newLicense, setNewLicense] = useState({
    license_key: '',
    device_limit: '',
    price: '',
    payment_status: 'pending'
  })

  useEffect(() => {
    if (isLoaded && user) {
      checkAdminStatus()
      fetchData()
    } else if (isLoaded && !user) {
      router.push('/login')
    }
  }, [isLoaded, user, router])

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/user/role')
      if (response.ok) {
        const data = await response.json()
        if (data.userRole?.role === 'admin') {
          setIsAdmin(true)
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      router.push('/dashboard')
    }
  }

  const fetchData = async () => {
    try {
      // Fetch enquiries
      const enquiriesResponse = await fetch('/api/enquiries')
      if (enquiriesResponse.ok) {
        const enquiriesData = await enquiriesResponse.json()
        setEnquiries(enquiriesData.enquiries || [])
      }

      // Fetch licenses overview
      const licensesResponse = await fetch('/api/admin/license-overview')
      if (licensesResponse.ok) {
        const licensesData = await licensesResponse.json()
        setLicenses(licensesData.licenses || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnquiryUpdate = async (enquiryId: number, updates: any) => {
    try {
      const response = await fetch('/api/enquiries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enquiry_id: enquiryId, ...updates })
      })

      if (response.ok) {
        fetchData()
        setShowEnquiryModal(false)
        setSelectedEnquiry(null)
      }
    } catch (error) {
      console.error('Error updating enquiry:', error)
    }
  }

  const generateLicenseKey = () => {
    const key = 'GH-' + 
      Math.random().toString(36).substring(2, 10).toUpperCase() + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).substring(2, 14).toUpperCase()
    setNewLicense({ ...newLicense, license_key: key })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600'
      case 'reviewing': return 'bg-blue-600'
      case 'approved': return 'bg-green-600'
      case 'rejected': return 'bg-red-600'
      case 'completed': return 'bg-purple-600'
      default: return 'bg-gray-600'
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Header */}
      <div className="bg-dark-800/80 backdrop-blur-sm border-b border-dark-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                License Management
              </h1>
              <p className="text-dark-300 mt-2">Manage enquiries, licenses, and blacklist</p>
            </div>
            <Link
              href="/admin"
              className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 bg-dark-700 rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab('enquiries')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'enquiries'
                ? 'bg-blue-600 text-white'
                : 'text-dark-300 hover:text-white'
            }`}
          >
            Enquiries ({enquiries.length})
          </button>
          <button
            onClick={() => setActiveTab('licenses')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'licenses'
                ? 'bg-blue-600 text-white'
                : 'text-dark-300 hover:text-white'
            }`}
          >
            Licenses ({licenses.length})
          </button>
          <button
            onClick={() => setActiveTab('blacklist')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'blacklist'
                ? 'bg-blue-600 text-white'
                : 'text-dark-300 hover:text-white'
            }`}
          >
            Blacklist
          </button>
        </div>

        {/* Enquiries Tab */}
        {activeTab === 'enquiries' && (
          <div>
            <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dark-700">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Devices
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-800 divide-y divide-dark-700">
                    {enquiries.map((enquiry) => (
                      <tr key={enquiry.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{enquiry.organization_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{enquiry.contact_person}</div>
                          <div className="text-sm text-dark-400">{enquiry.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{enquiry.device_count}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getStatusColor(enquiry.status)}`}>
                            {enquiry.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {new Date(enquiry.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button 
                            onClick={() => {
                              setSelectedEnquiry(enquiry)
                              setShowEnquiryModal(true)
                            }}
                            className="text-blue-400 hover:text-blue-300 mr-3"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Licenses Tab */}
        {activeTab === 'licenses' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Active Licenses</h2>
              <button
                onClick={() => setShowLicenseModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create License
              </button>
            </div>

            <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dark-700">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        License Key
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Devices
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-800 divide-y divide-dark-700">
                    {licenses.map((license) => (
                      <tr key={license.license_key}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-white">{license.license_key}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{license.organization_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {license.active_devices} / {license.device_limit}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${
                            license.is_blacklisted ? 'bg-red-600' : 'bg-green-600'
                          }`}>
                            {license.is_blacklisted ? 'Blacklisted' : license.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">${license.price}</div>
                          <div className="text-sm text-dark-400">{license.payment_status}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-400 hover:text-blue-300 mr-3">Edit</button>
                          <button className="text-red-400 hover:text-red-300">Blacklist</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Blacklist Tab */}
        {activeTab === 'blacklist' && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Blacklisted Licenses</h2>
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
              <p className="text-gray-300">Blacklist management coming soon...</p>
            </div>
          </div>
        )}
      </div>

      {/* Enquiry Review Modal */}
      {showEnquiryModal && selectedEnquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Review Enquiry</h3>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Organization</label>
                  <div className="text-white">{selectedEnquiry.organization_name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Contact</label>
                  <div className="text-white">{selectedEnquiry.contact_person}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <div className="text-white">{selectedEnquiry.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Devices</label>
                  <div className="text-white">{selectedEnquiry.device_count}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Admin Notes</label>
                <textarea
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add notes about this enquiry..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEnquiryModal(false)}
                className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEnquiryUpdate(selectedEnquiry.id, { status: 'approved' })}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create License Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Create New License</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">License Key</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newLicense.license_key}
                    onChange={(e) => setNewLicense({ ...newLicense, license_key: e.target.value })}
                    className="flex-1 bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="GH-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  />
                  <button
                    onClick={generateLicenseKey}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Device Limit</label>
                <input
                  type="number"
                  value={newLicense.device_limit}
                  onChange={(e) => setNewLicense({ ...newLicense, device_limit: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Price</label>
                <input
                  type="number"
                  value={newLicense.price}
                  onChange={(e) => setNewLicense({ ...newLicense, price: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="99.99"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowLicenseModal(false)}
                className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Handle license creation
                  setShowLicenseModal(false)
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Create License
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
