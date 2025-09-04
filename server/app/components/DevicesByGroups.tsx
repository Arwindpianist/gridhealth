'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

interface Device {
  device_id: string
  device_name: string
  os_name: string
  os_version: string
  hostname: string
  health_status: string
  last_seen: string
  license_key: string
  assigned_at?: string
}

interface DeviceGroup {
  id: number
  name: string
  description: string
  license_key: string
  created_at: string
  devices: Device[]
  device_count: number
}

interface DevicesByGroupsProps {
  initialGroups?: DeviceGroup[]
  initialUnassignedDevices?: Device[]
}

export default function DevicesByGroups({ initialGroups = [], initialUnassignedDevices = [] }: DevicesByGroupsProps) {
  const [groups, setGroups] = useState<DeviceGroup[]>(initialGroups)
  const [unassignedDevices, setUnassignedDevices] = useState<Device[]>(initialUnassignedDevices)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')

  useEffect(() => {
    fetchDevicesByGroups()
  }, [])

  useEffect(() => {
    if (groups.length > 0 || unassignedDevices.length > 0) {
      fetchHealthMetrics()
    }
  }, [groups, unassignedDevices])

  const fetchHealthMetrics = async () => {
    try {
      const allDeviceIds = [
        ...groups.flatMap(group => group.devices.map(d => d.device_id)),
        ...unassignedDevices.map(d => d.device_id)
      ]
      
      if (allDeviceIds.length === 0) return

      const response = await fetch('/api/health-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: allDeviceIds })
      })

      if (response.ok) {
        const data = await response.json()
        setHealthMetrics(data.metrics || [])
      }
    } catch (error) {
      console.error('Error fetching health metrics:', error)
    }
  }

  const fetchDevicesByGroups = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/devices/by-groups')
      if (response.ok) {
        const data = await response.json()
        setGroups(data.groups || [])
        setUnassignedDevices(data.unassigned_devices || [])
        
        // Set active tab to first group if available, otherwise 'unassigned'
        if (data.groups && data.groups.length > 0) {
          setActiveTab(data.groups[0].name)
        } else if (data.unassigned_devices && data.unassigned_devices.length > 0) {
          setActiveTab('unassigned')
        }
      }
    } catch (error) {
      console.error('Error fetching devices by groups:', error)
    } finally {
      setIsLoading(false)
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

  const [healthMetrics, setHealthMetrics] = useState<any[]>([])

  const getHealthScore = (device: Device) => {
    const metrics = healthMetrics.find(m => m.device_id === device.device_id)
    return metrics?.health_score || 85
  }

  const isDeviceOnline = (device: Device) => {
    if (!device.last_seen) return false
    const lastSeen = new Date(device.last_seen)
    const now = new Date()
    const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    return minutesSinceLastSeen <= 5
  }

  const allTabs = [
    { id: 'all', name: 'All Devices', count: groups.reduce((sum, group) => sum + group.device_count, 0) + unassignedDevices.length },
    ...groups.map(group => ({ id: group.name, name: group.name, count: group.device_count })),
    { id: 'unassigned', name: 'Unassigned', count: unassignedDevices.length }
  ]

  const getDevicesForTab = (tabId: string) => {
    if (tabId === 'all') {
      return [
        ...groups.flatMap(group => group.devices.map(device => ({ ...device, groupName: group.name }))),
        ...unassignedDevices.map(device => ({ ...device, groupName: 'Unassigned' }))
      ]
    } else if (tabId === 'unassigned') {
      return unassignedDevices.map(device => ({ ...device, groupName: 'Unassigned' }))
    } else {
      const group = groups.find(g => g.name === tabId)
      return group ? group.devices.map(device => ({ ...device, groupName: group.name })) : []
    }
  }

  const currentDevices = getDevicesForTab(activeTab)

  if (isLoading) {
    return (
      <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-dark-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-dark-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-dark-800 rounded-2xl border border-dark-700 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Devices Overview</h3>
        <div className="flex items-center space-x-3">
          {activeTab !== 'all' && activeTab !== 'unassigned' && groups.length > 0 && (
            <Link 
              href={`/group/${groups.find(g => g.name === activeTab)?.id}`}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              View Group Details
            </Link>
          )}
          {groups.length > 0 && (
            <Link 
              href="/management" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            >
              Manage Groups
            </Link>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      {groups.length > 0 && (
        <div className="flex space-x-1 bg-dark-700 rounded-lg p-1 mb-6 overflow-x-auto">
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-dark-300 hover:text-white'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {/* Devices Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-700">
          <thead className="bg-dark-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Device
              </th>
              {activeTab === 'all' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                  Group
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                OS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Last Seen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Health Score
              </th>
            </tr>
          </thead>
          <tbody className="bg-dark-800 divide-y divide-dark-700">
            {currentDevices.length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'all' ? 6 : 5} className="px-6 py-8 text-center">
                  <div className="text-dark-400">
                    {activeTab === 'unassigned' ? 'No unassigned devices' : 'No devices found'}
                  </div>
                </td>
              </tr>
            ) : (
                             currentDevices.map((device) => {
                 const healthScore = getHealthScore(device)
                 const isOnline = isDeviceOnline(device)
                 const metrics = healthMetrics.find(m => m.device_id === device.device_id)
                
                return (
                  <tr key={device.device_id} className="hover:bg-dark-700/30 transition-all duration-200 group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/dashboard/device/${device.device_id}`}
                        className="block hover:bg-dark-600/50 rounded-lg p-3 -m-3 transition-all duration-200 group-hover:scale-105"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            healthScore >= 80 ? 'bg-green-500/20' : 
                            healthScore >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                          }`}>
                            <svg className={`w-5 h-5 ${
                              healthScore >= 80 ? 'text-green-400' : 
                              healthScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white group-hover:text-gridhealth-400 transition-colors">
                              {device.device_name || device.hostname || 'Unknown Device'}
                            </div>
                            <div className="text-xs text-dark-400 font-mono">{device.device_id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    {activeTab === 'all' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          device.groupName === 'Unassigned' 
                            ? 'bg-gray-600 text-gray-300' 
                            : 'bg-blue-600 text-white'
                        }`}>
                          {device.groupName}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          device.os_name?.toLowerCase().includes('windows') ? 'bg-blue-400' :
                          device.os_name?.toLowerCase().includes('linux') ? 'bg-green-400' :
                          device.os_name?.toLowerCase().includes('mac') ? 'bg-purple-400' : 'bg-gray-400'
                        }`}></div>
                        <div>
                          <div className="text-sm text-white font-medium">{device.os_name || 'Unknown'}</div>
                          <div className="text-xs text-dark-400">{device.os_version || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${
                        isOnline 
                          ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                          : 'bg-red-500/20 text-red-300 border-red-500/30'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {device.last_seen ? new Date(device.last_seen).toLocaleDateString() : 'Never'}
                      </div>
                      {device.last_seen && (
                        <div className="text-xs text-dark-400">
                          {(() => {
                            const lastSeen = new Date(device.last_seen)
                            const now = new Date()
                            const diffMs = now.getTime() - lastSeen.getTime()
                            const diffMins = Math.floor(diffMs / (1000 * 60))
                            const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                            
                            if (diffMins < 60) return `${diffMins}m ago`
                            if (diffHours < 24) return `${diffHours}h ago`
                            return `${diffDays}d ago`
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                            healthScore >= 80 ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30' :
                            healthScore >= 60 ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border-2 border-red-500/30'
                          }`}>
                            {healthScore}
                          </div>
                          <div className="text-xs text-dark-400 mt-1">Overall</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
