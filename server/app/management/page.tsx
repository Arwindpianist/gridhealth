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

export default function ManagementPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'managers' | 'groups'>('managers')
  const [accountManagers, setAccountManagers] = useState<AccountManager[]>([])
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddManagerModal, setShowAddManagerModal] = useState(false)
  const [showAddGroupModal, setShowAddGroupModal] = useState(false)
  const [newManager, setNewManager] = useState({
    email: '',
    role: 'manager',
    permissions: { access_all: false, system_admin: false },
    group_access: []
  })
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    license_key: ''
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
        if (data.userRole?.role === 'admin' || data.userRole?.role === 'owner') {
          setIsAdmin(true)
        } else {
          // Redirect non-admin users
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
        setAccountManagers(managersData.managers || [])
      }

      // Fetch device groups
      const groupsResponse = await fetch('/api/device-groups')
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        setDeviceGroups(groupsData.groups || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddManager = async () => {
    try {
      const response = await fetch('/api/account-managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newManager)
      })

      if (response.ok) {
        setShowAddManagerModal(false)
        setNewManager({ email: '', role: 'manager', permissions: { access_all: false, system_admin: false }, group_access: [] })
        fetchData()
      }
    } catch (error) {
      console.error('Error adding manager:', error)
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-600'
      case 'admin': return 'bg-purple-600'
      case 'manager': return 'bg-blue-600'
      case 'viewer': return 'bg-gray-600'
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
                Management Center
              </h1>
              <p className="text-dark-300 mt-2">Manage account managers and device groups</p>
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

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex space-x-1 bg-dark-700 rounded-lg p-1 mb-8">
          <button
            onClick={() => setActiveTab('managers')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'managers'
                ? 'bg-blue-600 text-white'
                : 'text-dark-300 hover:text-white'
            }`}
          >
            Account Managers
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'groups'
                ? 'bg-blue-600 text-white'
                : 'text-dark-300 hover:text-white'
            }`}
          >
            Device Groups
          </button>
        </div>

        {/* Account Managers Tab */}
        {activeTab === 'managers' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Account Managers</h2>
              <button
                onClick={() => setShowAddManagerModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Manager
              </button>
            </div>

            <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-dark-700">
                  <thead className="bg-dark-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Permissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Group Access
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-dark-800 divide-y divide-dark-700">
                    {accountManagers.map((manager) => (
                      <tr key={manager.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{manager.user_email || manager.user_id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white ${getRoleColor(manager.role)}`}>
                            {manager.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-dark-300">
                            {manager.permissions?.access_all && <span className="block">• Access All</span>}
                            {manager.permissions?.system_admin && <span className="block">• System Admin</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-dark-300">
                            {manager.group_access?.length > 0 ? manager.group_access.join(', ') : 'All Groups'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-400 hover:text-blue-300 mr-3">Edit</button>
                          <button className="text-red-400 hover:text-red-300">Remove</button>
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Device Groups</h2>
              <button
                onClick={() => setShowAddGroupModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Group
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deviceGroups.map((group) => (
                <div key={group.id} className="bg-dark-800 border border-dark-700 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{group.name}</h3>
                      <p className="text-dark-400 text-sm">{group.description}</p>
                    </div>
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                      {group.device_count} devices
                    </span>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-dark-400">License:</span>
                      <span className="text-white font-mono text-xs">{group.license_key}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Created:</span>
                      <span className="text-white">{new Date(group.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors">
                      Manage Devices
                    </button>
                    <button className="bg-dark-700 hover:bg-dark-600 text-white px-3 py-2 rounded text-sm transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Manager Modal */}
      {showAddManagerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Add Account Manager</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                <input
                  type="email"
                  value={newManager.email}
                  onChange={(e) => setNewManager({ ...newManager, email: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">Role</label>
                <select
                  value={newManager.role}
                  onChange={(e) => setNewManager({ ...newManager, role: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newManager.permissions.access_all}
                    onChange={(e) => setNewManager({
                      ...newManager,
                      permissions: { ...newManager.permissions, access_all: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-dark-300">Access All</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newManager.permissions.system_admin}
                    onChange={(e) => setNewManager({
                      ...newManager,
                      permissions: { ...newManager.permissions, system_admin: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-dark-300">System Admin</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddManagerModal(false)}
                className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManager}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Manager
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
                <input
                  type="text"
                  value={newGroup.license_key}
                  onChange={(e) => setNewGroup({ ...newGroup, license_key: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter license key"
                />
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
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
