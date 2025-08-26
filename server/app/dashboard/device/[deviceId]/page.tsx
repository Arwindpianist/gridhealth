import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '../../../../lib/supabase'
import { getDeviceHealthData } from '../../../../lib/healthMetrics'
import { generateDeviceReportCSV } from '../../../../lib/reportGenerator'
import HealthMetricsDisplay from '../../../components/HealthMetricsDisplay'

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

  // Get device health data
  const healthData = await getDeviceHealthData(deviceId)
  if (!healthData) {
    redirect('/dashboard')
  }

  // Get recent health metrics
  const { data: healthMetrics } = await supabaseAdmin
    .from('health_metrics')
    .select('*')
    .eq('device_id', deviceId)
    .order('timestamp', { ascending: false })
    .limit(20)

  // Get recent heartbeats
  const { data: heartbeats } = await supabaseAdmin
    .from('health_metrics')
    .select('*')
    .eq('device_id', deviceId)
    .eq('metric_type', 'heartbeat')
    .order('timestamp', { ascending: false })
    .limit(10)

  // Get organization info
  const { data: license } = await supabaseAdmin
    .from('licenses')
    .select('*, organizations(name)')
    .eq('license_key', device.license_key)
    .single()

  const organizationName = license?.organizations?.name || 'Unknown Organization'

  // Generate CSV report
  const csvReport = await generateDeviceReportCSV(deviceId)

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
                  healthData.health_score.overall >= 80 ? 'bg-green-500/20' : 
                  healthData.health_score.overall >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                }`}>
                  <svg className={`w-6 h-6 ${
                    healthData.health_score.overall >= 80 ? 'text-green-400' : 
                    healthData.health_score.overall >= 60 ? 'text-yellow-400' : 'text-red-400'
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
              {csvReport && (
                <a 
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvReport)}`}
                  download={`device-report-${device.device_id}.csv`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Report
                </a>
              )}
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
                  <span className="text-3xl font-bold text-white">{healthData.health_score.overall}/100</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-4 mb-2">
                  <div 
                    className={`h-4 rounded-full transition-all duration-500 ${
                      healthData.health_score.overall >= 80 ? 'bg-green-500' :
                      healthData.health_score.overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthData.health_score.overall}%` }}
                  ></div>
                </div>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    healthData.health_score.overall >= 80 ? 'bg-green-400' : 
                    healthData.health_score.overall >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-xs text-dark-400">
                    {healthData.health_score.overall >= 80 ? 'Healthy' : 
                     healthData.health_score.overall >= 60 ? 'Warning' : 'Critical'}
                  </span>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                <label className="text-sm text-gray-400 font-medium mb-2 block">Status</label>
                <div className="flex items-center p-3 bg-dark-700/50 rounded-lg border border-dark-600/30">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    healthData.status === 'online' ? 'bg-green-500 animate-pulse' :
                    healthData.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-white font-semibold capitalize">{healthData.status}</span>
                </div>
              </div>

              {/* Uptime */}
              <div className="mb-4">
                <label className="text-sm text-gray-400 font-medium mb-2 block">Uptime</label>
                <p className="text-white font-medium">{healthData.uptime_percentage}%</p>
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
              'Performance': { score: healthData.health_score.performance, color: 'green', icon: '⚡' },
              'Disk': { score: healthData.health_score.disk, color: 'blue', icon: '💾' },
              'Memory': { score: healthData.health_score.memory, color: 'purple', icon: '🧠' },
              'Network': { score: healthData.health_score.network, color: 'yellow', icon: '🌐' },
              'Services': { score: healthData.health_score.services, color: 'orange', icon: '🔧' },
              'Security': { score: healthData.health_score.security, color: 'red', icon: '🛡️' }
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

        {/* Detailed System Information */}
        {healthData.latest_health_scan && (
          <>
            {/* Performance Metrics */}
            {healthData.latest_health_scan.performance_metrics && (
              <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6 mb-8 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white">Performance Metrics</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-blue-500/50 transition-all duration-200 hover:scale-105 group">
                    <div className="p-3 bg-blue-500/20 rounded-lg mb-3 group-hover:bg-blue-500/30 transition-all">
                      <svg className="w-6 h-6 text-blue-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                      {healthData.latest_health_scan.performance_metrics.cpu_usage_percent || 0}%
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
                      {healthData.latest_health_scan.performance_metrics.memory_usage_percent || 0}%
                    </div>
                    <div className="text-sm text-gray-400 font-medium">Memory Usage</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-green-500/50 transition-all duration-200 hover:scale-105 group">
                    <div className="p-3 bg-green-500/20 rounded-lg mb-3 group-hover:bg-green-500/30 transition-all">
                      <svg className="w-6 h-6 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-white group-hover:text-green-400 transition-colors">
                      {healthData.latest_health_scan.performance_metrics.process_count || 0}
                    </div>
                    <div className="text-sm text-gray-400 font-medium">Processes</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-yellow-500/50 transition-all duration-200 hover:scale-105 group">
                    <div className="p-3 bg-yellow-500/20 rounded-lg mb-3 group-hover:bg-yellow-500/30 transition-all">
                      <svg className="w-6 h-6 text-yellow-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                      </svg>
                    </div>
                    <div className="text-2xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                      {healthData.latest_health_scan.performance_metrics.thread_count || 0}
                    </div>
                    <div className="text-sm text-gray-400 font-medium">Threads</div>
                  </div>
                </div>
              </div>
            )}

            {/* Disk Health */}
            {healthData.latest_health_scan.disk_health && healthData.latest_health_scan.disk_health.length > 0 && (
              <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6 mb-8 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-blue-500/20 rounded-xl">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white">Disk Health</h2>
                </div>
                <div className="space-y-4">
                  {healthData.latest_health_scan.disk_health.map((disk: any, index: number) => (
                    <div key={index} className="p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-blue-500/50 transition-all duration-200">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-500/20 rounded-lg">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                            </svg>
                          </div>
                          <span className="text-white font-semibold text-lg">Drive {disk.drive_letter}</span>
                          {disk.volume_name && (
                            <span className="text-dark-400 text-sm">({disk.volume_name})</span>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          disk.health_status === 'Healthy' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          disk.health_status === 'Warning' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {disk.health_status}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="p-3 bg-dark-600/30 rounded-lg border border-dark-500/20">
                          <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">Free Space:</span>
                          <div className="text-white font-semibold mt-1">
                            {((disk.free_space_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Free %:</span>
                          <div className="text-white font-medium">{disk.free_space_percent?.toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Total:</span>
                          <div className="text-white font-medium">
                            {((disk.total_size_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-dark-600 rounded-full h-2 mt-2">
                        <div 
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${100 - (disk.free_space_percent || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory Health */}
            {healthData.latest_health_scan.memory_health && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Memory Health</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.memory_health.memory_usage_percent?.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-gray-400">Usage</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {((healthData.latest_health_scan.memory_health.available_physical_memory_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
                    </div>
                    <div className="text-sm text-gray-400">Available</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {((healthData.latest_health_scan.memory_health.total_physical_memory_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
                    </div>
                    <div className="text-sm text-gray-400">Total</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.memory_health.memory_pressure_level || 'Normal'}
                    </div>
                    <div className="text-sm text-gray-400">Pressure</div>
                  </div>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-3 mt-4">
                  <div 
                    className="h-3 bg-blue-500 rounded-full"
                    style={{ width: `${healthData.latest_health_scan.memory_health.memory_usage_percent || 0}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Network Health */}
            {healthData.latest_health_scan.network_health && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Network Health</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.network_health.active_connections || 0}
                    </div>
                    <div className="text-sm text-gray-400">Active Connections</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.network_health.network_adapter_count || 0}
                    </div>
                    <div className="text-sm text-gray-400">Network Adapters</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.network_health.internet_connectivity ? '✅' : '❌'}
                    </div>
                    <div className="text-sm text-gray-400">Internet</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.network_health.dns_servers?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">DNS Servers</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {healthData.latest_health_scan.network_health.network_interfaces?.map((ni: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-dark-700 rounded-lg">
                      <div>
                        <span className="text-white font-medium">{ni.name}</span>
                        <div className="text-sm text-gray-400">
                          {ni.ip_addresses?.join(', ') || 'No IP'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          ni.is_connected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {ni.is_connected ? 'Connected' : 'Disconnected'}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          {ni.speed_mbps} Mbps
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Health */}
            {healthData.latest_health_scan.service_health && healthData.latest_health_scan.service_health.length > 0 && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Service Health</h2>
                <div className="space-y-2">
                  {healthData.latest_health_scan.service_health.map((service: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-dark-700 rounded-lg">
                      <div>
                        <span className="text-white font-medium">{service.display_name}</span>
                        <div className="text-sm text-gray-400">{service.service_name}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          service.status === 'Running' ? 'bg-green-600 text-white' :
                          service.status === 'Stopped' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                        }`}>
                          {service.status}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          {service.startup_type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Health */}
            {healthData.latest_health_scan.security_health && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Security Health</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.security_health.uac_enabled ? '✅' : '❌'}
                    </div>
                    <div className="text-sm text-gray-400">UAC Enabled</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.security_health.security_updates_available || 0}
                    </div>
                    <div className="text-sm text-gray-400">Updates Available</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.security_health.antivirus_status || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-400">Antivirus</div>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Information */}
            {healthData.latest_health_scan.agent_info && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Agent Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.agent_info.version || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-400">Version</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.agent_info.uptime_seconds || 0}s
                    </div>
                    <div className="text-sm text-gray-400">Uptime</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.agent_info.total_scans_performed || 0}
                    </div>
                    <div className="text-sm text-gray-400">Scans Performed</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.agent_info.last_successful_scan ? '✅' : '❌'}
                    </div>
                    <div className="text-sm text-gray-400">Last Scan</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Recent Health Data */}
        {healthMetrics && healthMetrics.length > 0 && (
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6 mb-8 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-indigo-500/20 rounded-xl">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Recent Health Data</h2>
            </div>
            <div className="space-y-3">
              {healthMetrics.slice(0, 10).map((metric) => (
                <div key={metric.id} className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl border border-dark-600/30 hover:border-indigo-500/50 transition-all duration-200 hover:scale-105 group">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      metric.metric_type === 'heartbeat' ? 'bg-red-500/20' : 'bg-blue-500/20'
                    }`}>
                      {metric.metric_type === 'heartbeat' ? (
                        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">
                        {metric.metric_type === 'heartbeat' ? 'Heartbeat' : 'Health Check'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(metric.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {metric.value || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {metric.metric_type === 'heartbeat' ? 'Status' : 'Health Score'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

                {/* Comprehensive Health Metrics Display */}
        {healthData.latest_health_scan && (
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6 mb-8 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gridhealth-500/20 rounded-xl">
                <svg className="w-6 h-6 text-gridhealth-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">Comprehensive Health Overview</h2>
            </div>
            <HealthMetricsDisplay healthData={healthData.latest_health_scan} />
          </div>
        )}
      </div>
    </div>
  )
} 