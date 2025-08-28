'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Device {
  device_id: string
  device_name: string
  hostname: string
  os_name: string
  os_version: string
  health_status: string
  health_score: number
  last_health_check: string
  last_seen: string
  group_name?: string
  license_key: string
  performance_metrics?: any
  disk_health?: any[]
  memory_health?: any
  network_health?: any
  service_health?: any[]
  security_health?: any
}

interface DeviceGroup {
  id: number
  name: string
  description: string
  device_count: number
}

export default function DevicesPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [devices, setDevices] = useState<Device[]>([])
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([])
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (isLoaded && user) {
      fetchDevices()
      fetchDeviceGroups()
    } else if (isLoaded && !user) {
      router.push('/login')
    }
  }, [isLoaded, user, router])

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/devices')
      if (response.ok) {
        const data = await response.json()
        setDevices(data.devices || [])
      }
    } catch (error) {
      console.error('Error fetching devices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDeviceGroups = async () => {
    try {
      const response = await fetch('/api/device-groups')
      if (response.ok) {
        const data = await response.json()
        setDeviceGroups(data.groups || [])
      }
    } catch (error) {
      console.error('Error fetching device groups:', error)
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-600'
      case 'warning':
        return 'bg-yellow-600'
      case 'critical':
        return 'bg-red-600'
      default:
        return 'bg-gray-600'
    }
  }

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy'
      case 'warning':
        return 'Warning'
      case 'critical':
        return 'Critical'
      default:
        return 'Unknown'
    }
  }

  const getTroubleshootingTips = (device: Device) => {
    const tips = []

    // General health tips
    if (device.health_score < 50) {
      tips.push({
        title: 'Critical Health Issues',
        description: 'This device requires immediate attention due to critical health problems.',
        actions: [
          'Check system resources (CPU, memory, disk)',
          'Review system logs for errors',
          'Restart critical services',
          'Consider system reboot if issues persist'
        ]
      })
    } else if (device.health_score < 80) {
      tips.push({
        title: 'Health Warning',
        description: 'This device has some health issues that should be addressed.',
        actions: [
          'Monitor system performance',
          'Check for resource bottlenecks',
          'Review recent system changes',
          'Update system drivers if needed'
        ]
      })
    }

    // Specific metric tips
    if (device.performance_metrics) {
      if (device.performance_metrics.cpu_usage_percent > 90) {
        tips.push({
          title: 'High CPU Usage',
          description: 'CPU usage is critically high, which may cause system slowdowns.',
          actions: [
            'Check for runaway processes',
            'Close unnecessary applications',
            'Monitor task manager for high CPU processes',
            'Consider CPU upgrade if persistent'
          ]
        })
      }

      if (device.performance_metrics.memory_usage_percent > 90) {
        tips.push({
          title: 'High Memory Usage',
          description: 'Memory usage is critically high, which may cause system instability.',
          actions: [
            'Close memory-intensive applications',
            'Check for memory leaks',
            'Increase virtual memory if needed',
            'Consider adding more RAM'
          ]
        })
      }
    }

    // Disk health tips
    if (device.disk_health && device.disk_health.length > 0) {
      const lowDiskSpace = device.disk_health.some(disk => 
        disk.free_space_percent < 20
      )
      
      if (lowDiskSpace) {
        tips.push({
          title: 'Low Disk Space',
          description: 'One or more disks have critically low free space.',
          actions: [
            'Remove unnecessary files and applications',
            'Clear temporary files and cache',
            'Move large files to external storage',
            'Consider disk cleanup or expansion'
          ]
        })
      }
    }

    // Service health tips
    if (device.service_health && device.service_health.length > 0) {
      const stoppedServices = device.service_health.filter(service => 
        service.status !== 'Running'
      )
      
      if (stoppedServices.length > 0) {
        tips.push({
          title: 'Stopped Services',
          description: 'Some critical services are not running properly.',
          actions: [
            'Check service status in Services app',
            'Restart stopped services',
            'Review service dependencies',
            'Check Windows Event Viewer for errors'
          ]
        })
      }
    }

    return tips
  }

  const filteredDevices = devices.filter(device => {
    const matchesGroup = selectedGroup === 'all' || 
      (device.group_name && device.group_name.toLowerCase().includes(selectedGroup.toLowerCase()))
    
    const matchesSearch = device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.os_name.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesGroup && matchesSearch
  })

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
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
                Device Management
              </h1>
              <p className="text-dark-300 mt-2">Monitor and manage your organization's devices</p>
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

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Group Filter */}
          <div className="flex-1">
            <label htmlFor="group-filter" className="block text-sm font-medium text-dark-300 mb-2">
              Filter by Group
            </label>
            <select
              id="group-filter"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Groups</option>
              {deviceGroups.map(group => (
                <option key={group.id} value={group.name}>
                  {group.name} ({group.device_count})
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-dark-300 mb-2">
              Search Devices
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by name, hostname, or OS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Devices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => (
            <div
              key={device.device_id}
              onClick={() => {
                setSelectedDevice(device)
                setShowDeviceModal(true)
              }}
              className="bg-dark-800 border border-dark-700 rounded-xl p-6 cursor-pointer hover:border-blue-500/50 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {device.device_name || device.hostname || 'Unknown Device'}
                  </h3>
                  <p className="text-dark-400 text-sm">{device.hostname}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getHealthStatusColor(device.health_status)}`}>
                  {getHealthStatusText(device.health_status)}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">OS:</span>
                  <span className="text-white">{device.os_name} {device.os_version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Health Score:</span>
                  <span className={`font-medium ${
                    device.health_score >= 80 ? 'text-green-400' :
                    device.health_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {device.health_score}/100
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Last Seen:</span>
                  <span className="text-white">
                    {new Date(device.last_seen).toLocaleDateString()}
                  </span>
                </div>
                {device.group_name && (
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-400">Group:</span>
                    <span className="text-white">{device.group_name}</span>
                  </div>
                )}
              </div>

              <div className="text-center">
                <span className="text-blue-400 text-sm hover:text-blue-300">
                  Click for details →
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredDevices.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-dark-300">No devices found</h3>
            <p className="mt-1 text-sm text-dark-400">
              {searchTerm || selectedGroup !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No devices have been registered yet.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Device Detail Modal */}
      {showDeviceModal && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedDevice.device_name || selectedDevice.hostname || 'Unknown Device'}
                  </h2>
                  <p className="text-dark-300">Device ID: {selectedDevice.device_id}</p>
                </div>
                <button
                  onClick={() => setShowDeviceModal(false)}
                  className="text-dark-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Device Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-dark-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Device Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-400">Hostname:</span>
                      <span className="text-white">{selectedDevice.hostname}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">OS:</span>
                      <span className="text-white">{selectedDevice.os_name} {selectedDevice.os_version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Group:</span>
                      <span className="text-white">{selectedDevice.group_name || 'No Group'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">License Key:</span>
                      <span className="text-white font-mono text-xs">{selectedDevice.license_key}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-dark-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Health Status</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-dark-400">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getHealthStatusColor(selectedDevice.health_status)}`}>
                        {getHealthStatusText(selectedDevice.health_status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Health Score:</span>
                      <span className={`font-medium ${
                        selectedDevice.health_score >= 80 ? 'text-green-400' :
                        selectedDevice.health_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {selectedDevice.health_score}/100
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Last Health Check:</span>
                      <span className="text-white">
                        {selectedDevice.last_health_check ? 
                          new Date(selectedDevice.last_health_check).toLocaleString() : 'Never'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-400">Last Seen:</span>
                      <span className="text-white">
                        {new Date(selectedDevice.last_seen).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Troubleshooting Tips */}
              {selectedDevice.health_status !== 'healthy' && (
                <div className="bg-dark-700 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">🔧 Troubleshooting Tips</h3>
                  <div className="space-y-4">
                    {getTroubleshootingTips(selectedDevice).map((tip, index) => (
                      <div key={index} className="border-l-4 border-yellow-500 pl-4">
                        <h4 className="text-yellow-400 font-semibold mb-2">{tip.title}</h4>
                        <p className="text-dark-300 mb-3">{tip.description}</p>
                        <ul className="space-y-1">
                          {tip.actions.map((action, actionIndex) => (
                            <li key={actionIndex} className="text-sm text-white flex items-start">
                              <span className="text-blue-400 mr-2">•</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Health Metrics */}
              {selectedDevice.performance_metrics && (
                <div className="bg-dark-700 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Performance Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedDevice.performance_metrics.cpu_usage_percent && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-dark-400">CPU Usage</span>
                          <span className="text-white">{selectedDevice.performance_metrics.cpu_usage_percent}%</span>
                        </div>
                        <div className="w-full bg-dark-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              selectedDevice.performance_metrics.cpu_usage_percent > 90 ? 'bg-red-500' :
                              selectedDevice.performance_metrics.cpu_usage_percent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${selectedDevice.performance_metrics.cpu_usage_percent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    {selectedDevice.performance_metrics.memory_usage_percent && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-dark-400">Memory Usage</span>
                          <span className="text-white">{selectedDevice.performance_metrics.memory_usage_percent}%</span>
                        </div>
                        <div className="w-full bg-dark-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              selectedDevice.performance_metrics.memory_usage_percent > 90 ? 'bg-red-500' :
                              selectedDevice.performance_metrics.memory_usage_percent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${selectedDevice.performance_metrics.memory_usage_percent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeviceModal(false)}
                  className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement device refresh action
                    alert('Device refresh functionality coming soon!')
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Refresh Device
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
