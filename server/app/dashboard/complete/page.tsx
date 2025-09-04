import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '../../../lib/supabase'
import { calculateHealthScore, getOrganizationHealthSummary, getDeviceHealthData } from '../../../lib/healthMetrics'
import { generateOrganizationReportCSV } from '../../../lib/reportGenerator'

async function getDashboardData(userId: string) {
  try {
    // Get user data
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (!user) return null

    // Get user roles
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('*, organizations(name, subscription_status, device_limit), companies(name)')
      .eq('user_id', user.id)

    // Get organizations user has access to
    const { data: organizations } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .in('id', roles?.map(r => r.organization_id).filter(Boolean) || [])

    // Get companies user has access to
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select('*')
      .in('id', roles?.map(r => r.company_id).filter(Boolean) || [])

    // Check if user is individual (no org/company)
    const isIndividual = roles?.some(r => r.role === 'individual') || false

    // Get licenses for user's organizations
    const orgIds = organizations?.map(o => o.id) || []
    const { data: licenses } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .in('organization_id', orgIds)
      .eq('status', 'active')

    // Get devices for user's organizations (using the new devices table structure)
    const { data: devices } = await supabaseAdmin
      .from('devices')
      .select('*')
      .in('license_key', licenses?.map(l => l.license_key) || [])

    // Get health metrics for user's devices
    const deviceIds = devices?.map(d => d.device_id) || []
    const { data: healthMetrics } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .eq('device_id', deviceIds)
      .order('timestamp', { ascending: false })
      .limit(100)

    // Get comprehensive health data for each device
    const deviceHealthData = await Promise.all(
      devices?.map(async (device) => {
        const healthData = await getDeviceHealthData(device.device_id)
        return {
          device,
          healthData
        }
      }) || []
    )

    // Get organization health summary if user has organizations
    let organizationHealthSummary = null
    if (organizations && organizations.length > 0) {
      organizationHealthSummary = await getOrganizationHealthSummary(organizations[0].id)
    }

    return {
      user,
      roles: roles || [],
      organizations: organizations || [],
      companies: companies || [],
      licenses: licenses || [],
      devices: devices || [],
      healthMetrics: healthMetrics || [],
      deviceHealthData: deviceHealthData || [],
      organizationHealthSummary,
      isIndividual
    }
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return null
  }
}

export default async function CompleteDashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/')
  }

  const dashboardData = await getDashboardData(userId)
  
  if (!dashboardData) {
    redirect('/onboarding')
  }

  const { user, roles, organizations, companies, licenses, devices, healthMetrics, deviceHealthData, organizationHealthSummary, isIndividual } = dashboardData
  
  // Calculate stats
  const totalDevices = devices.length
  const activeDevices = devices.filter(d => d.is_active).length
  const totalLicenses = licenses.length
  const totalDeviceLimit = licenses.reduce((sum, license) => sum + license.device_limit, 0)
  const availableDevices = totalDeviceLimit - totalDevices

  // Get recent health data
  const recentHealthData = healthMetrics.slice(0, 5)
  
  // Calculate device status (online/offline based on last_seen)
  const onlineDevices = devices.filter(d => {
    if (!d.last_seen) return false
    const lastSeen = new Date(d.last_seen)
    const now = new Date()
    const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
    return minutesSinceLastSeen <= 5 // Device is online if last seen within 5 minutes
  }).length

  const offlineDevices = totalDevices - onlineDevices

  // Calculate average health score
  const averageHealthScore = deviceHealthData.length > 0 
    ? Math.round(deviceHealthData.reduce((sum, { healthData }) => sum + (healthData?.health_score?.overall || 100), 0) / deviceHealthData.length)
    : 100

  // Calculate health distribution
  const healthyDevices = deviceHealthData.filter(({ healthData }) => (healthData?.health_score?.overall || 100) >= 80).length
  const warningDevices = deviceHealthData.filter(({ healthData }) => {
    const score = healthData?.health_score?.overall || 100
    return score >= 60 && score < 80
  }).length
  const criticalDevices = deviceHealthData.filter(({ healthData }) => (healthData?.health_score?.overall || 100) < 60).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Enhanced Header */}
      <div className="bg-dark-800/80 backdrop-blur-sm border-b border-dark-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-gridhealth-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    GridHealth Dashboard
                  </h1>
                  <p className="text-dark-300 text-sm">Monitor your system health and devices</p>
                </div>
              </div>
              {totalDevices > 0 && (
                <div className="hidden md:flex items-center space-x-2 ml-6 pl-6 border-l border-dark-600">
                  <div className={`w-3 h-3 rounded-full ${onlineDevices > 0 ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-dark-300">
                    {onlineDevices > 0 ? `${onlineDevices} device${onlineDevices > 1 ? 's' : ''} online` : 'All devices offline'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Link 
                href="/profile" 
                className="bg-dark-700 hover:bg-dark-600 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
              <Link 
                href="/licenses" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Licenses
              </Link>
              <Link 
                href="/download" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download
              </Link>
              {/* Management button for organization/company owners and system admins */}
              {roles.some(r => r.role === 'admin' || r.role === 'owner' || 
                (r.role === 'organization' && r.organization_id) || 
                (r.role === 'company' && r.company_id)) && (
                <Link 
                  href="/management" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Management
                </Link>
              )}
              {roles.some(r => r.role === 'admin') && (
                <Link 
                  href="/admin" 
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
                >
                  👑 Admin
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Devices Card */}
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-dark-600/50 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-300 text-sm font-medium mb-1">Total Devices</p>
                <p className="text-3xl font-bold text-white group-hover:text-blue-400 transition-colors">{totalDevices}</p>
                <p className="text-xs text-dark-400 mt-1">{activeDevices} active</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-all">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Online Devices Card */}
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-dark-600/50 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-300 text-sm font-medium mb-1">Online Devices</p>
                <p className="text-3xl font-bold text-white group-hover:text-green-400 transition-colors">{onlineDevices}</p>
                <p className="text-xs text-green-400 mt-1">
                  {offlineDevices > 0 ? `${offlineDevices} offline` : 'All devices online'}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-xl group-hover:bg-green-500/30 transition-all">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Licenses Card */}
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-dark-600/50 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-300 text-sm font-medium mb-1">Licenses</p>
                <p className="text-3xl font-bold text-white group-hover:text-purple-400 transition-colors">{totalLicenses}</p>
                <p className="text-xs text-dark-400 mt-1">{availableDevices} slots available</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-all">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Health Score Card */}
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-dark-600/50 hover:border-dark-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-300 text-sm font-medium mb-1">Avg Health</p>
                <p className="text-3xl font-bold text-white group-hover:text-yellow-400 transition-colors">{averageHealthScore}/100</p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className={`w-2 h-2 rounded-full ${averageHealthScore >= 80 ? 'bg-green-400' : averageHealthScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}></div>
                  <span className="text-xs text-dark-400">
                    {averageHealthScore >= 80 ? 'Healthy' : averageHealthScore >= 60 ? 'Warning' : 'Critical'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-xl group-hover:bg-yellow-500/30 transition-all">
                <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Health Distribution Chart */}
        {totalDevices > 0 && (
          <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl p-6 border border-dark-600/50 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Health Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-dark-300 text-sm">Healthy</span>
                <span className="text-white font-semibold ml-auto">{healthyDevices}</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <span className="text-dark-300 text-sm">Warning</span>
                <span className="text-white font-semibold ml-auto">{warningDevices}</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <span className="text-dark-300 text-sm">Critical</span>
                <span className="text-white font-semibold ml-auto">{criticalDevices}</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Devices List */}
        <div className="bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-600/50 flex justify-between items-center bg-dark-700/30">
            <div>
              <h2 className="text-xl font-semibold text-white">Device Overview</h2>
              <p className="text-dark-300 text-sm">Monitor your registered devices and their health status</p>
            </div>
            {organizations.length > 0 && (
              <div className="flex space-x-3">
                <a 
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(await generateOrganizationReportCSV(organizations[0].id) || '')}`}
                  download={`organization-report-${organizations[0].name}.csv`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg text-sm flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Report
                </a>
              </div>
            )}
          </div>
          
          {devices.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-dark-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No devices registered yet</h3>
              <p className="text-dark-400 mb-6">Install the GridHealth agent on your devices to get started with monitoring.</p>
              <Link 
                href="/download" 
                className="bg-gridhealth-600 hover:bg-gridhealth-700 text-white px-6 py-3 rounded-lg transition-all duration-200 hover:shadow-lg inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Agent
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-600/50">
                <thead className="bg-dark-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      OS
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Health Score
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Last Scan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-dark-600/30">
                  {deviceHealthData.map(({ device, healthData }) => {
                    const healthScore = healthData?.health_score
                    const latestHealthScan = healthData?.latest_health_scan
                    
                    return (
                      <tr key={device.device_id} className="hover:bg-dark-700/30 transition-all duration-200 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link 
                            href={`/dashboard/device/${device.device_id}`}
                            className="block hover:bg-dark-600/50 rounded-lg p-3 -m-3 transition-all duration-200 group-hover:scale-105"
                          >
                            <div className="flex items-center space-x-3">
                                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              (healthScore?.overall || 100) >= 80 ? 'bg-green-500/20' : 
                              (healthScore?.overall || 100) >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                            }`}>
                              <svg className={`w-5 h-5 ${
                                (healthScore?.overall || 100) >= 80 ? 'text-green-400' : 
                                (healthScore?.overall || 100) >= 60 ? 'text-yellow-400' : 'text-red-400'
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
                          {(() => {
                            if (!device.last_seen) {
                              return (
                                <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                  Never Seen
                                </span>
                              )
                            }
                            
                            const lastSeen = new Date(device.last_seen)
                            const now = new Date()
                            const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
                            const isOnline = minutesSinceLastSeen <= 5
                            
                            return (
                              <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full border ${
                                isOnline 
                                  ? 'bg-green-500/20 text-green-300 border-green-500/30' 
                                  : 'bg-red-500/20 text-red-300 border-red-500/30'
                              }`}>
                                <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                            )
                          })()}
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
                          {healthScore ? (
                            <div className="flex items-center space-x-3">
                              <div className="flex flex-col items-center">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${
                                  healthScore.overall >= 80 ? 'bg-green-500/20 text-green-400 border-2 border-green-500/30' :
                                  healthScore.overall >= 60 ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30' :
                                  'bg-red-500/20 text-red-400 border-2 border-red-500/30'
                                }`}>
                                  {healthScore.overall}
                                </div>
                                <div className="text-xs text-dark-400 mt-1">Overall</div>
                              </div>
                              {latestHealthScan && (
                                <div className="text-xs text-dark-400 space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-green-400">P: {healthScore.performance}</span>
                                    <span className="text-blue-400">D: {healthScore.disk}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-purple-400">M: {healthScore.memory}</span>
                                    <span className="text-yellow-400">N: {healthScore.network}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-orange-400">S: {healthScore.services}</span>
                                    <span className="text-red-400">Sec: {healthScore.security}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-dark-400">No data</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">
                            {latestHealthScan ? new Date(latestHealthScan.timestamp).toLocaleDateString() : 'Never'}
                          </div>
                          {latestHealthScan && (
                            <div className="text-xs text-dark-400">
                              {(() => {
                                const lastScan = new Date(latestHealthScan.timestamp)
                                const now = new Date()
                                const diffMs = now.getTime() - lastScan.getTime()
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
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/download" 
              className="flex items-center p-4 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all duration-200 hover:scale-105 group border border-dark-600/50 hover:border-blue-500/50"
            >
              <div className="p-3 bg-blue-500/20 rounded-lg mr-4 group-hover:bg-blue-500/30 transition-all">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">Download Agent</h4>
                <p className="text-sm text-dark-400">Get the GridHealth monitoring agent</p>
              </div>
            </Link>

            <Link 
              href="/licenses" 
              className="flex items-center p-4 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all duration-200 hover:scale-105 group border border-dark-600/50 hover:border-purple-500/50"
            >
              <div className="p-3 bg-purple-500/20 rounded-lg mr-4 group-hover:bg-purple-500/30 transition-all">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-white group-hover:text-purple-400 transition-colors">Manage Licenses</h4>
                <p className="text-sm text-dark-400">View and manage your licenses</p>
              </div>
            </Link>

            <Link 
              href="/profile" 
              className="flex items-center p-4 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-all duration-200 hover:scale-105 group border border-dark-600/50 hover:border-green-500/50"
            >
              <div className="p-3 bg-green-500/20 rounded-lg mr-4 group-hover:bg-green-500/30 transition-all">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h4 className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">Edit Profile</h4>
                <p className="text-sm text-dark-400">Update your account settings</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 