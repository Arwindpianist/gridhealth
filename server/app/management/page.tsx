'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AccountManager {
  id: number
  user_id: string
  role: string
  permissions: any
  group_access: string[]
  created_at: string
  user_email?: string
}

interface DeviceGroup {
  id: number
  name: string
  description: string
  device_count: number
  license_key: string
  created_at: string
}

interface AvailableLicense {
  license_key: string
  device_limit: number
  status: string
  payment_status: string
}

interface Device {
  device_id: string
  device_name: string
  os_name: string
  os_version: string
  hostname: string
  health_status: string
  last_heartbeat: string
  license_key: string
}

export default function ManagementPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'managers' | 'groups'>('managers')
  const [accountManagers, setAccountManagers] = useState<AccountManager[]>([])
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([])
  const [availableLicenses, setAvailableLicenses] = useState<AvailableLicense[]>([])
  const [availableDevices, setAvailableDevices] = useState<Device[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddManagerModal, setShowAddManagerModal] = useState(false)
  const [showEditManagerModal, setShowEditManagerModal] = useState(false)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [showAssignDevicesModal, setShowAssignDevicesModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroup | null>(null)
  const [newManager, setNewManager] = useState({
    email: '',
    role: 'manager',
    permissions: { access_all: false, system_admin: false },
    group_access: []
  })
  const [editingManager, setEditingManager] = useState<AccountManager | null>(null)
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    license_key: ''
  })
  const [selectedDevices, setSelectedDevices] = useState<string[]>([])
  const [managerError, setManagerError] = useState('')

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
        // Allow access for system admins, organization owners, and company owners
        if (data.userRole?.role === 'admin' || 
            data.userRole?.role === 'owner' ||
            (data.userRole?.role === 'organization' && data.userRole?.organization_id) ||
            (data.userRole?.role === 'company' && data.userRole?.company_id)) {
          setIsAdmin(true)
        } else {
          // Redirect users who don't have management access
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
      // Fetch account managers
      const managersResponse = await fetch('/api/account-managers')
      if (managersResponse.ok) {
        const managersData = await managersResponse.json()
        setAccountManagers(managersData.accountManagers || [])
      }

      // Fetch device groups
      const groupsResponse = await fetch('/api/device-groups')
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        setDeviceGroups(groupsData.groups || [])
      }

      // Fetch available licenses
      const licensesResponse = await fetch('/api/licenses/available')
      if (licensesResponse.ok) {
        const licensesData = await licensesResponse.json()
        setAvailableLicenses(licensesData.licenses || [])
      }

      // Fetch available devices
      const devicesResponse = await fetch('/api/devices')
      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json()
        setAvailableDevices(devicesData.devices || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddManager = async () => {
    try {
      setManagerError('')
      const response = await fetch('/api/account-managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newManager)
      })

      const data = await response.json()

      if (response.ok) {
        setShowAddManagerModal(false)
        setNewManager({ email: '', role: 'manager', permissions: { access_all: false, system_admin: false }, group_access: [] })
        fetchData()
      } else {
        setManagerError(data.error || 'Failed to add manager')
      }
    } catch (error) {
      console.error('Error adding manager:', error)
      setManagerError('Network error. Please try again.')
    }
  }

  const handleEditManager = async () => {
    try {
      if (!editingManager) return
      
      setManagerError('')
      const response = await fetch('/api/account-managers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerId: editingManager.id,
          role: editingManager.role,
          permissions: editingManager.permissions,
          group_access: editingManager.group_access
        })
      })

      const data = await response.json()

      if (response.ok) {
        setShowEditManagerModal(false)
        setEditingManager(null)
        fetchData()
      } else {
        setManagerError(data.error || 'Failed to update manager')
      }
    } catch (error) {
      console.error('Error updating manager:', error)
      setManagerError('Network error. Please try again.')
    }
  }

  const handleAddGroup = async () => {
    try {
      const response = await fetch('/api/device-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGroup)
      })

      if (response.ok) {
        setShowAddGroupModal(false)
        setNewGroup({ name: '', description: '', license_key: '' })
        fetchData()
      }
    } catch (error) {
      console.error('Error adding group:', error)
    }
  }

  const handleAssignDevices = async () => {
    try {
      if (!selectedGroup || selectedDevices.length === 0) return

      const response = await fetch('/api/device-groups/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: selectedGroup.id,
          device_ids: selectedDevices
        })
      })

      if (response.ok) {
        setShowAssignDevicesModal(false)
        setSelectedGroup(null)
        setSelectedDevices([])
        fetchData()
      }
    } catch (error) {
      console.error('Error assigning devices:', error)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-600'
      case 'admin': return 'bg-purple-600'
      case 'manager': return 'bg-blue-600'
      case 'viewer': return 'bg-gray-600'
      default: return 'bg-gray-600'
    }
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-600'
      case 'warning': return 'bg-yellow-600'
      case 'critical': return 'bg-red-600'
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
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-dark-800/95 to-dark-700/95 backdrop-blur-sm border-b border-dark-600/50 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  Management Center
                </h1>
                <p className="text-dark-300 mt-1 text-lg">Manage account managers and device groups</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Enhanced Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-dark-800/50 to-dark-700/50 backdrop-blur-sm rounded-2xl border border-dark-600/30 p-2 mb-8 shadow-xl">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('managers')}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform ${
                activeTab === 'managers'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'text-dark-300 hover:text-white hover:bg-dark-600/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <span>Account Managers</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform ${
                activeTab === 'groups'
                  ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg scale-105'
                  : 'text-dark-300 hover:text-white hover:bg-dark-600/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Device Groups</span>
              </div>
            </button>
          </div>
        </div>

        {/* Account Managers Tab */}
        {activeTab === 'managers' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Account Managers
                </h2>
                <p className="text-dark-300 mt-2">Manage user access and permissions</p>
              </div>
              <button
                onClick={() => setShowAddManagerModal(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Manager</span>
              </button>
            </div>

            <div className="bg-gradient-to-br from-dark-800/80 to-dark-700/80 backdrop-blur-sm rounded-2xl border border-dark-600/30 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dark-600/30">
                  <thead className="bg-gradient-to-r from-dark-700/80 to-dark-600/80">
                    <tr>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-dark-200 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>User</span>
                        </div>
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-dark-200 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Role</span>
                        </div>
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-dark-200 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 4v6m-4-6h8" />
                          </svg>
                          <span>Permissions</span>
                        </div>
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-dark-200 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span>Group Access</span>
                        </div>
                      </th>
                      <th className="px-8 py-4 text-left text-xs font-semibold text-dark-200 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                          </svg>
                          <span>Actions</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-800/50 divide-y divide-dark-600/30">
                    {accountManagers.map((manager) => (
                      <tr key={manager.id} className="hover:bg-dark-700/30 transition-all duration-200 group">
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-white">{manager.user_email || manager.user_id}</div>
                              <div className="text-xs text-dark-400">Account Manager</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full text-white shadow-lg ${getRoleColor(manager.role)}`}>
                            {manager.role}
                          </span>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="text-sm text-dark-300 space-y-1">
                            {manager.permissions?.access_all && (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                <span>Access All</span>
                              </div>
                            )}
                            {manager.permissions?.system_admin && (
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                                <span>System Admin</span>
                              </div>
                            )}
                            {!manager.permissions?.access_all && !manager.permissions?.system_admin && (
                              <span className="text-dark-400">No special permissions</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="text-sm text-dark-300">
                            {manager.group_access?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {manager.group_access.slice(0, 2).map((group, index) => (
                                  <span key={index} className="px-2 py-1 bg-dark-600/50 rounded-md text-xs">
                                    {group}
                                  </span>
                                ))}
                                {manager.group_access.length > 2 && (
                                  <span className="px-2 py-1 bg-dark-600/50 rounded-md text-xs">
                                    +{manager.group_access.length - 2} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-green-400 font-medium">All Groups</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-3">
                            <button 
                              onClick={() => {
                                setEditingManager(manager)
                                setShowEditManagerModal(true)
                              }}
                              className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 px-3 py-1 rounded-lg transition-all duration-200 flex items-center space-x-1"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                            <button className="bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 px-3 py-1 rounded-lg transition-all duration-200 flex items-center space-x-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Remove</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Device Groups Tab */}
        {activeTab === 'groups' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                  Device Groups
                </h2>
                <p className="text-dark-300 mt-2">Organize devices into logical groups</p>
              </div>
              <button
                onClick={() => setShowAddGroupModal(true)}
                className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Group</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {deviceGroups.map((group) => (
                <div key={group.id} className="bg-gradient-to-br from-dark-800/80 to-dark-700/80 backdrop-blur-sm border border-dark-600/30 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{group.name}</h3>
                      <p className="text-dark-400 text-sm leading-relaxed">{group.description}</p>
                    </div>
                    <div className="ml-4">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                        {group.device_count} devices
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="text-dark-300">License:</span>
                      </div>
                      <span className="text-white font-mono text-xs bg-dark-600/50 px-2 py-1 rounded">{group.license_key}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0H8m6 0v4m-6-4v4m6-4h6m-6 0H8m6 0v4m-6-4v4" />
                        </svg>
                        <span className="text-dark-300">Created:</span>
                      </div>
                      <span className="text-white">{new Date(group.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/group/${group.id}`}
                      className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>View Group</span>
                    </Link>
                    <button 
                      onClick={() => {
                        setSelectedGroup(group)
                        setShowAssignDevicesModal(true)
                      }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Assign Devices</span>
                    </button>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-dark-600/30">
                    <button className="w-full bg-dark-700/50 hover:bg-dark-600/50 text-white px-4 py-2 rounded-lg text-sm transition-all duration-200 flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Group</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Add Manager Modal */}
      {showAddManagerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-dark-800/95 to-dark-700/95 backdrop-blur-sm rounded-2xl max-w-md w-full p-8 shadow-2xl border border-dark-600/30">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Add Account Manager</h3>
            </div>
            {managerError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-300">{managerError}</p>
              </div>
            )}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-3">Email Address</label>
                <input
                  type="email"
                  value={newManager.email}
                  onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                  className="w-full bg-dark-700/50 border border-dark-600/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="user@example.com"
                />
                <p className="text-xs text-dark-400 mt-2 flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>User must already have a GridHealth account</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-3">Role</label>
                <select
                  value={newManager.role}
                  onChange={(e) => setNewManager({ ...newManager, role: e.target.value })}
                  className="w-full bg-dark-700/50 border border-dark-600/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-dark-200 mb-3">Permissions</label>
                <div className="space-y-3">
                  <label className="flex items-center p-3 bg-dark-700/30 rounded-lg hover:bg-dark-600/30 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newManager.permissions.access_all}
                      onChange={(e) => setNewManager({
                        ...newManager,
                        permissions: { ...newManager.permissions, access_all: e.target.checked }
                      })}
                      className="mr-3 w-4 h-4 text-blue-600 bg-dark-600 border-dark-500 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-white font-medium">Access All Groups</span>
                    </div>
                  </label>
                  <label className="flex items-center p-3 bg-dark-700/30 rounded-lg hover:bg-dark-600/30 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newManager.permissions.system_admin}
                      onChange={(e) => setNewManager({
                        ...newManager,
                        permissions: { ...newManager.permissions, system_admin: e.target.checked }
                      })}
                      className="mr-3 w-4 h-4 text-purple-600 bg-dark-600 border-dark-500 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="text-sm text-white font-medium">System Admin</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowAddManagerModal(false)
                  setManagerError('')
                }}
                className="bg-dark-700/50 hover:bg-dark-600/50 text-white px-6 py-3 rounded-xl transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancel</span>
              </button>
              <button
                onClick={handleAddManager}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Manager</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Manager Modal */}
      {showEditManagerModal && editingManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Edit Account Manager</h3>
            {managerError && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-300">{managerError}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">User</label>
                <div className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2">
                  {editingManager.user_email || editingManager.user_id}
                </div>
                <p className="text-xs text-dark-400 mt-1">User email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Role</label>
                <select
                  value={editingManager.role}
                  onChange={(e) => setEditingManager({ ...editingManager, role: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingManager.permissions?.access_all || false}
                    onChange={(e) => setEditingManager({
                      ...editingManager,
                      permissions: { ...editingManager.permissions, access_all: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-dark-300">Access All</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingManager.permissions?.system_admin || false}
                    onChange={(e) => setEditingManager({
                      ...editingManager,
                      permissions: { ...editingManager.permissions, system_admin: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-dark-300">System Admin</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Group Access</label>
                <div className="text-xs text-dark-400 mb-2">
                  Select specific groups this manager can access. Leave empty for "Access All" or select specific groups.
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {deviceGroups.map((group) => (
                    <label key={group.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingManager.group_access?.includes(group.name) || false}
                        onChange={(e) => {
                          const currentGroups = editingManager.group_access || []
                          if (e.target.checked) {
                            setEditingManager({
                              ...editingManager,
                              group_access: [...currentGroups, group.name]
                            })
                          } else {
                            setEditingManager({
                              ...editingManager,
                              group_access: currentGroups.filter(g => g !== group.name)
                            })
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-white">{group.name}</span>
                      <span className="text-xs text-dark-400 ml-2">({group.device_count} devices)</span>
                    </label>
                  ))}
                </div>
                {deviceGroups.length === 0 && (
                  <p className="text-sm text-yellow-400">No device groups available</p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditManagerModal(false)
                  setEditingManager(null)
                  setManagerError('')
                }}
                className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditManager}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Update Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {showAddGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Add Device Group</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Group Name</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Production Servers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Group for production environment servers"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">License Key</label>
                <select
                  value={newGroup.license_key}
                  onChange={(e) => setNewGroup({ ...newGroup, license_key: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a license key</option>
                  {availableLicenses.map((license) => (
                    <option key={license.license_key} value={license.license_key}>
                      {license.license_key} ({license.device_limit} devices)
                    </option>
                  ))}
                </select>
                {availableLicenses.length === 0 && (
                  <p className="text-sm text-yellow-400 mt-1">
                    No active licenses available. Please contact an administrator.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddGroupModal(false)}
                className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGroup}
                disabled={!newGroup.license_key}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Devices Modal */}
      {showAssignDevicesModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              Assign Devices to "{selectedGroup.name}"
            </h3>
            <p className="text-dark-300 mb-4">
              Select devices that use license key: <span className="font-mono text-white">{selectedGroup.license_key}</span>
            </p>
            
            <div className="space-y-4">
              {availableDevices
                .filter(device => device.license_key === selectedGroup.license_key)
                .map((device) => (
                  <div key={device.device_id} className="flex items-center space-x-3 p-3 bg-dark-700 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.device_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDevices([...selectedDevices, device.device_id])
                        } else {
                          setSelectedDevices(selectedDevices.filter(id => id !== device.device_id))
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">{device.device_name || device.hostname}</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getHealthColor(device.health_status)}`}>
                          {device.health_status}
                        </span>
                      </div>
                      <div className="text-sm text-dark-400">
                        {device.os_name} {device.os_version} • {device.hostname}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {availableDevices.filter(device => device.license_key === selectedGroup.license_key).length === 0 && (
              <div className="text-center py-8">
                <p className="text-dark-300">No devices found using this license key.</p>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignDevicesModal(false)
                  setSelectedGroup(null)
                  setSelectedDevices([])
                }}
                className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignDevices}
                disabled={selectedDevices.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Assign {selectedDevices.length} Device{selectedDevices.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
