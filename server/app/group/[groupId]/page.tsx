'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter, useParams } from 'next/navigation'
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
  assigned_at: string
}

interface GroupDetails {
  id: number
  name: string
  description: string
  license_key: string
  created_at: string
  device_count: number
  devices: Device[]
}

interface HealthMetrics {
  device_id: string
  timestamp: string
  health_score: number
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_status: string
}

export default function GroupOverviewPage() {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const params = useParams()
  const groupId = params.groupId as string

  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null)
  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (isLoaded && user && groupId) {
      fetchGroupDetails()
    } else if (isLoaded && !user) {
      router.push('/login')
    }
  }, [isLoaded, user, groupId, router])

  const fetchGroupDetails = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch(`/api/device-groups/${groupId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch group details')
      }

      const data = await response.json()
      setGroupDetails(data.group)

      // Fetch health metrics for all devices in the group
      if (data.group.devices && data.group.devices.length > 0) {
        const deviceIds = data.group.devices.map((d: Device) => d.device_id)
        await fetchHealthMetrics(deviceIds)
      }
    } catch (err) {
      console.error('Error fetching group details:', err)
      setError('Failed to load group details')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHealthMetrics = async (deviceIds: string[]) => {
    try {
      const response = await fetch('/api/health-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: deviceIds })
      })

      if (response.ok) {
        const data = await response.json()
        setHealthMetrics(data.metrics || [])
      } else {
        console.error('Failed to fetch health metrics:', response.status)
      }
    } catch (err) {
      console.error('Error fetching health metrics:', err)
    }
  }

  const downloadGroupReport = async () => {
    try {
      setIsDownloading(true)
      const response = await fetch(`/api/reports/group/${groupId}/csv`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${groupDetails?.name}-group-report-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        throw new Error('Failed to download report')
      }
    } catch (err) {
      console.error('Error downloading report:', err)
      setError('Failed to download report')
    } finally {
      setIsDownloading(false)
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

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const formatLastSeen = (lastSeen: string) => {
    const date = new Date(lastSeen)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return `${Math.floor(diffMins / 1440)} days ago`
  }

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading group details...</div>
      </div>
    )
  }

  if (error || !groupDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Group Not Found</h1>
            <p className="text-dark-300 mb-6">{error || 'The requested group could not be found.'}</p>
            <Link
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const averageHealthScore = groupDetails.devices.length > 0
    ? Math.round(groupDetails.devices.reduce((sum, device) => {
        const metrics = healthMetrics.find(m => m.device_id === device.device_id)
        return sum + (metrics?.health_score || 100)
      }, 0) / groupDetails.devices.length)
    : 100

  const onlineDevices = groupDetails.devices.filter(d => {
    if (!d.last_seen) return false
    const lastSeen = new Date(d.last_seen)
    const now = new Date()
    const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    return minutesSinceLastSeen <= 5
  }).length

  const offlineDevices = groupDetails.device_count - onlineDevices

  const healthyDevices = groupDetails.devices.filter(d => d.health_status === 'healthy').length
  const warningDevices = groupDetails.devices.filter(d => d.health_status === 'warning').length
  const criticalDevices = groupDetails.devices.filter(d => d.health_status === 'critical').length

  // Calculate additional health metrics
  const averageCpuUsage = healthMetrics.length > 0
    ? Math.round(healthMetrics.reduce((sum, m) => sum + m.cpu_usage, 0) / healthMetrics.length)
    : 0

  const averageMemoryUsage = healthMetrics.length > 0
    ? Math.round(healthMetrics.reduce((sum, m) => sum + m.memory_usage, 0) / healthMetrics.length)
    : 0

  const averageDiskUsage = healthMetrics.length > 0
    ? Math.round(healthMetrics.reduce((sum, m) => sum + m.disk_usage, 0) / healthMetrics.length)
    : 0

  const networkIssues = healthMetrics.filter(m => m.network_status !== 'connected').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Header */}
      <div className="bg-dark-800/80 backdrop-blur-sm border-b border-dark-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                {groupDetails.name}
              </h1>
              <p className="text-dark-300 mt-2">{groupDetails.description}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadGroupReport}
                disabled={isDownloading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Report
                  </>
                )}
              </button>
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
        {/* Health Metrics Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Health Metrics Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl border border-green-500/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-300 text-sm font-medium">Overall Health</p>
                  <p className="text-3xl font-bold text-white">{averageHealthScore}%</p>
                  <p className="text-green-300 text-sm">{healthyDevices} healthy • {warningDevices} warning</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl border border-blue-500/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium">Device Status</p>
                  <p className="text-3xl font-bold text-white">{groupDetails.device_count}</p>
                  <p className="text-blue-300 text-sm">{onlineDevices} online • {offlineDevices} offline</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl border border-orange-500/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-300 text-sm font-medium">Critical Alerts</p>
                  <p className="text-3xl font-bold text-white">{criticalDevices}</p>
                  <p className="text-orange-300 text-sm">{warningDevices + criticalDevices} total alerts</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl border border-red-500/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-300 text-sm font-medium">Network Issues</p>
                  <p className="text-3xl font-bold text-white">{networkIssues}</p>
                  <p className="text-red-300 text-sm">Connection problems</p>
                </div>
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl border border-purple-500/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">CPU Usage</h3>
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold text-white">{averageCpuUsage}%</div>
                <div className="flex-1">
                  <div className="w-full bg-dark-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        averageCpuUsage > 80 ? 'bg-red-500' : 
                        averageCpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${averageCpuUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-2xl border border-cyan-500/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Memory Usage</h3>
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold text-white">{averageMemoryUsage}%</div>
                <div className="flex-1">
                  <div className="w-full bg-dark-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        averageMemoryUsage > 80 ? 'bg-red-500' : 
                        averageMemoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${averageMemoryUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-2xl border border-yellow-500/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Disk Usage</h3>
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-bold text-white">{averageDiskUsage}%</div>
                <div className="flex-1">
                  <div className="w-full bg-dark-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        averageDiskUsage > 80 ? 'bg-red-500' : 
                        averageDiskUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${averageDiskUsage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Group Details */}
        <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Group Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Basic Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dark-300">Group Name:</span>
                  <span className="text-white font-medium">{groupDetails.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Description:</span>
                  <span className="text-white">{groupDetails.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Created:</span>
                  <span className="text-white">{new Date(groupDetails.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">License Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-dark-300">License Key:</span>
                  <span className="text-white font-mono text-sm">{groupDetails.license_key}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Device Count:</span>
                  <span className="text-white">{groupDetails.device_count} devices</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-300">Status:</span>
                  <span className="text-green-400">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Devices Table */}
        <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-700">
            <h2 className="text-xl font-bold text-white">Device Health Details</h2>
            <p className="text-dark-300 text-sm mt-1">Real-time health metrics and performance data</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-dark-700">
              <thead className="bg-dark-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Health Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    CPU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Memory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Disk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-dark-800 divide-y divide-dark-700">
                                 {groupDetails.devices.map((device) => {
                   const metrics = healthMetrics.find(m => m.device_id === device.device_id)
                   const healthScore = metrics?.health_score || 100
                   const isOnline = device.last_seen ? (() => {
                     const lastSeen = new Date(device.last_seen)
                     const now = new Date()
                     const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
                     return minutesSinceLastSeen <= 5
                   })() : false
                   
                   return (
                     <tr key={device.device_id} className="hover:bg-dark-700/50 transition-colors">
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div>
                           <div className="text-sm font-medium text-white">
                             {device.device_name || device.hostname}
                           </div>
                           <div className="text-sm text-dark-400">{device.hostname}</div>
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
                         <div className={`text-sm font-medium ${getHealthScoreColor(healthScore)}`}>
                           {healthScore}%
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-white">
                           {metrics?.cpu_usage || 0}%
                         </div>
                         <div className="w-16 bg-dark-700 rounded-full h-1 mt-1">
                           <div 
                             className={`h-1 rounded-full ${
                               (metrics?.cpu_usage || 0) > 80 ? 'bg-red-500' : 
                               (metrics?.cpu_usage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                             }`}
                             style={{ width: `${metrics?.cpu_usage || 0}%` }}
                           ></div>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-white">
                           {metrics?.memory_usage || 0}%
                         </div>
                         <div className="w-16 bg-dark-700 rounded-full h-1 mt-1">
                           <div 
                             className={`h-1 rounded-full ${
                               (metrics?.memory_usage || 0) > 80 ? 'bg-red-500' : 
                               (metrics?.memory_usage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                             }`}
                             style={{ width: `${metrics?.memory_usage || 0}%` }}
                           ></div>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-white">
                           {metrics?.disk_usage || 0}%
                         </div>
                         <div className="w-16 bg-dark-700 rounded-full h-1 mt-1">
                           <div 
                             className={`h-1 rounded-full ${
                               (metrics?.disk_usage || 0) > 80 ? 'bg-red-500' : 
                               (metrics?.disk_usage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                             }`}
                             style={{ width: `${metrics?.disk_usage || 0}%` }}
                           ></div>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                           metrics?.network_status === 'connected' 
                             ? 'bg-green-600 text-white' 
                             : 'bg-red-600 text-white'
                         }`}>
                           {metrics?.network_status || 'unknown'}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                         <Link
                           href={`/dashboard/device/${device.device_id}`}
                           className="text-blue-400 hover:text-blue-300 mr-3"
                         >
                           View Details
                         </Link>
                         <button className="text-green-400 hover:text-green-300">
                           Download Report
                         </button>
                       </td>
                     </tr>
                   )
                 })}
              </tbody>
            </table>
          </div>
        </div>

        {groupDetails.devices.length === 0 && (
          <div className="text-center py-12">
            <div className="text-dark-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No devices in this group</h3>
            <p className="text-dark-300 mb-6">This group doesn't have any devices assigned to it yet.</p>
            <Link
              href="/management"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Assign Devices
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
