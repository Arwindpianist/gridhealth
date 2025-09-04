import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '../../../../lib/supabase'

import HealthMetricsDisplay from '../../../components/HealthMetricsDisplay'

// Force dynamic rendering to prevent caching of health data
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface DevicePageProps {
  params: {
    deviceId: string
  }
}

export default async function DevicePage({ params }: DevicePageProps) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/')
  }

  const { deviceId } = params

  // Get device information
  const { data: device } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('device_id', deviceId)
    .single()

  if (!device) {
    redirect('/dashboard')
  }

  // Get device health data using the health metrics API
  const healthMetricsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/health-metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_ids: [deviceId] })
  })

  let healthMetrics = []
  if (healthMetricsResponse.ok) {
    const healthData = await healthMetricsResponse.json()
    healthMetrics = healthData.metrics || []
    console.log('Health metrics received:', healthMetrics)
  } else {
    console.error('Failed to fetch health metrics:', healthMetricsResponse.status, healthMetricsResponse.statusText)
  }

  // Get the latest health metrics for this device
  const latestMetrics = healthMetrics[0] || {
    device_id: deviceId,
    health_score: 100,
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
    network_status: 'unknown',
    performance_score: 100,
    disk_score: 100,
    memory_score: 100,
    network_score: 100,
    services_score: 100,
    security_score: 100
  }
  
  console.log('Latest metrics for device:', latestMetrics)

  // Calculate device status
  const isOnline = device.last_seen ? (() => {
    const lastSeen = new Date(device.last_seen)
    const now = new Date()
    const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    return minutesSinceLastSeen <= 5
  })() : false

  const status = isOnline ? 'online' : 'offline'
  const uptimePercentage = isOnline ? 100 : 0

  // Get organization info
  const { data: license } = await supabaseAdmin
    .from('licenses')
    .select('*, organizations(name)')
    .eq('license_key', device.license_key)
    .single()

  const organizationName = license?.organizations?.name || 'Unknown Organization'

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Enhanced Header */}
      <div className="bg-dark-800/80 backdrop-blur-sm border-b border-dark-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-3">
                <Link href="/dashboard" className="hover:text-white transition-colors flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m5-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </Link>
                <span className="text-dark-500">/</span>
                <span className="text-white font-medium">Device Details</span>
              </nav>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  latestMetrics.health_score >= 80 ? 'bg-green-500/20' : 
                  latestMetrics.health_score >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                }`}>
                  <svg className={`w-6 h-6 ${
                    latestMetrics.health_score >= 80 ? 'text-green-400' : 
                    latestMetrics.health_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    {device.device_name || device.hostname || 'Device Details'}
                  </h1>
                  <p className="text-dark-300 text-sm">Detailed information and health monitoring</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Link 
                href="/dashboard" 
                className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m5-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Back to Dashboard
              </Link>
              <div className="flex space-x-2">
                <a 
                  href={`/api/reports/device/${device.device_id}/pdf`}
                  target="_blank"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF Report
                </a>
                <a 
                  href={`/api/reports/device/${device.device_id}/html`}
                  target="_blank"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  HTML Report
                </a>
              </div>
              <Link 
                href="/admin" 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
              >
                👑 Admin
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Device Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Device Information */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Device Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Device Name</label>
                    <p className="text-white font-semibold mt-1">{device.device_name || 'Unknown'}</p>
                  </div>
                  <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Hostname</label>
                    <p className="text-white font-semibold mt-1">{device.hostname || 'Unknown'}</p>
                  </div>
                  <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Operating System</label>
                    <p className="text-white font-semibold mt-1">{device.os_name || 'Unknown'} {device.os_version || ''}</p>
                  </div>
                  <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Device Type</label>
                    <p className="text-white font-semibold mt-1">{device.device_type || 'Unknown'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">MAC Address</label>
                    <p className="text-white font-semibold mt-1 font-mono text-sm">{device.mac_address || 'Unknown'}</p>
                  </div>
                  <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">IP Address</label>
                    <p className="text-white font-semibold mt-1 font-mono text-sm">{device.ip_address || 'Unknown'}</p>
                  </div>
                  <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Activation Date</label>
                    <p className="text-white font-semibold mt-1">
                      {device.activation_date ? new Date(device.activation_date).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                  <div className="p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-medium">Last Seen</label>
                    <p className="text-white font-semibold mt-1">
                      {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Health Status */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">Health Status</h2>
              </div>
              
              {/* Overall Health Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400 font-medium">Overall Health</span>
                  <span className="text-3xl font-bold text-white">{latestMetrics.health_score}/100</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-4 mb-2">
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ${
                      latestMetrics.health_score >= 80 ? 'bg-green-500' :
                      latestMetrics.health_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${latestMetrics.health_score}%` }}
                  ></div>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    latestMetrics.health_score >= 80 ? 'bg-green-400' : 
                    latestMetrics.health_score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-xs text-dark-400">
                    {latestMetrics.health_score >= 80 ? 'Healthy' : 
                     latestMetrics.health_score >= 60 ? 'Warning' : 'Critical'}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                <label className="text-sm text-gray-400 font-medium mb-2 block">Status</label>
                <div className="flex items-center p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`}></div>
                  <span className="text-white font-semibold capitalize">{status}</span>
                </div>
              </div>

              {/* Uptime */}
              <div className="mb-4">
                <label className="text-sm text-gray-400 font-medium mb-2 block">Uptime</label>
                <p className="text-white font-medium">{uptimePercentage}%</p>
              </div>

              {/* Organization */}
              <div>
                <label className="text-sm text-gray-400">Organization</label>
                <p className="text-white font-medium">{organizationName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Health Metrics Breakdown */}
        <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6 mb-8 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Health Metrics Breakdown</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {Object.entries({
              'Performance': { score: latestMetrics.performance_score || 0, color: 'green', icon: '⚡' },
              'Disk': { score: latestMetrics.disk_score || 0, color: 'blue', icon: '💾' },
              'Memory': { score: latestMetrics.memory_score || 0, color: 'purple', icon: '🧠' },
              'Network': { score: latestMetrics.network_score || 0, color: 'yellow', icon: '🌐' },
              'Services': { score: latestMetrics.services_score || 0, color: 'orange', icon: '🔧' },
              'Security': { score: latestMetrics.security_score || 0, color: 'red', icon: '🛡️' }
            }).map(([category, { score, color, icon }]) => (
              <div key={category} className="text-center p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-dark-500/50 transition-all duration-200 hover:scale-105 group">
                <div className="text-3xl mb-2">{icon}</div>
                <div className="text-3xl font-bold text-white mb-2 group-hover:text-white transition-colors">{score}/100</div>
                <div className="text-sm text-gray-400 font-medium mb-3">{category}</div>
                <div className="w-full bg-dark-600 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      score >= 80 ? 'bg-green-500' :
                      score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-center mt-2">
                  <div className={`w-2 h-2 rounded-full ${
                    score >= 80 ? 'bg-green-400' : 
                    score >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-xs text-dark-400 ml-1">
                    {score >= 80 ? 'Healthy' : score >= 60 ? 'Warning' : 'Critical'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Performance Metrics */}
        <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6 mb-8 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Real-time Performance Metrics</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-blue-500/50 transition-all duration-200 hover:scale-105 group">
              <div className="p-3 bg-blue-500/20 rounded-lg mb-3 group-hover:bg-blue-500/30 transition-all">
                <svg className="w-6 h-6 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                {latestMetrics.cpu_usage}%
              </div>
              <div className="text-sm text-gray-400 font-medium">CPU Usage</div>
            </div>
            <div className="text-center p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-purple-500/50 transition-all duration-200 hover:scale-105 group">
              <div className="p-3 bg-purple-500/20 rounded-lg mb-3 group-hover:bg-purple-500/30 transition-all">
                <svg className="w-6 h-6 text-purple-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                {latestMetrics.memory_usage}%
              </div>
              <div className="text-sm text-gray-400 font-medium">Memory Usage</div>
            </div>
            <div className="text-center p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-green-500/50 transition-all duration-200 hover:scale-105 group">
              <div className="p-3 bg-green-500/20 rounded-lg mb-3 group-hover:bg-green-500/30 transition-all">
                <svg className="w-6 h-6 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white group-hover:text-green-400 transition-colors">
                {latestMetrics.disk_usage}%
              </div>
              <div className="text-sm text-gray-400 font-medium">Disk Usage</div>
            </div>
            <div className="text-center p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-yellow-500/50 transition-all duration-200 hover:scale-105 group">
              <div className="p-3 bg-yellow-500/20 rounded-lg mb-3 group-hover:bg-yellow-500/30 transition-all">
                <svg className="w-6 h-6 text-yellow-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                {latestMetrics.network_status}
              </div>
              <div className="text-sm text-gray-400 font-medium">Network Status</div>
            </div>
          </div>
        </div>

        {/* Additional device information can be added here */}
      </div>
    </div>
  )
}
