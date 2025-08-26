import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '../../../lib/supabase'
import { calculateHealthScore, getOrganizationHealthSummary } from '../../../lib/healthMetrics'
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

  const { user, organizations, companies, licenses, devices, healthMetrics, organizationHealthSummary, isIndividual } = dashboardData
  
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

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">GridHealth Dashboard</h1>
              <p className="text-dark-300">Monitor your system health and devices</p>
              {totalDevices > 0 && (
                <div className="flex items-center mt-2">
                  <div className={`w-2 h-2 rounded-full mr-2 ${onlineDevices > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-dark-300">
                    {onlineDevices > 0 ? `${onlineDevices} device${onlineDevices > 1 ? 's' : ''} online` : 'All devices offline'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex space-x-4">
              <Link 
                href="/profile" 
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Edit Profile
              </Link>
              <Link 
                href="/licenses" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Manage Licenses
              </Link>
              <Link 
                href="/download" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Download Agent
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-dark-300 text-sm font-medium">Total Devices</p>
                <p className="text-2xl font-bold text-white">{totalDevices}</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-dark-300 text-sm font-medium">Online Devices</p>
                <p className="text-2xl font-bold text-white">{onlineDevices}</p>
                <p className="text-xs text-green-400">{offlineDevices > 0 ? `${offlineDevices} offline` : 'All devices online'}</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-dark-300 text-sm font-medium">Licenses</p>
                <p className="text-2xl font-bold text-white">{totalLicenses}</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-dark-300 text-sm font-medium">Available Slots</p>
                <p className="text-2xl font-bold text-white">{availableDevices}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Devices List */}
        <div className="bg-dark-800 rounded-lg border border-dark-700">
          <div className="px-6 py-4 border-b border-dark-700 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-white">Devices</h2>
              <p className="text-dark-300">Monitor your registered devices</p>
            </div>
            {organizations.length > 0 && (
              <div className="flex space-x-3">
                <a 
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(await generateOrganizationReportCSV(organizations[0].id) || '')}`}
                  download={`organization-report-${organizations[0].name}.csv`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  📊 Download Organization Report
                </a>
              </div>
            )}
          </div>
          {devices.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-dark-300">No devices registered yet.</p>
              <p className="text-dark-400 text-sm mt-1">Install the GridHealth agent on your devices to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-700">
                <thead className="bg-dark-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      OS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Last Seen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Health Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-dark-800 divide-y divide-dark-700">
                  {devices.map((device) => {
                    const deviceHealth = healthMetrics.find(h => h.device_id === device.device_id)
                    const healthScore = deviceHealth ? calculateHealthScore(deviceHealth) : null
                    
                    return (
                      <tr key={device.device_id} className="hover:bg-dark-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link 
                            href={`/dashboard/device/${device.device_id}`}
                            className="block hover:bg-dark-600 rounded p-2 -m-2 transition-colors"
                          >
                            <div>
                              <div className="text-sm font-medium text-white hover:text-gridhealth-400 transition-colors">
                                {device.device_name || device.hostname || 'Unknown Device'}
                              </div>
                              <div className="text-sm text-dark-400">{device.device_id}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-dark-300">{device.os_name || 'Unknown'}</div>
                          <div className="text-sm text-dark-400">{device.os_version || ''}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            if (!device.last_seen) {
                              return (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  Never Seen
                                </span>
                              )
                            }
                            
                            const lastSeen = new Date(device.last_seen)
                            const now = new Date()
                            const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
                            const isOnline = minutesSinceLastSeen <= 5
                            
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                isOnline 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {isOnline ? '🟢 Online' : '🔴 Offline'}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {device.last_seen ? new Date(device.last_seen).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {healthScore ? (
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-2 ${
                                healthScore.overall >= 80 ? 'bg-green-500' :
                                healthScore.overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-sm text-white">{healthScore.overall}/100</span>
                            </div>
                          ) : (
                            <span className="text-sm text-dark-400">No data</span>
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

        {/* Recent Health Data */}
        {healthMetrics.length > 0 && (
          <div className="bg-dark-800 rounded-lg border border-dark-700">
            <div className="px-6 py-4 border-b border-dark-700">
              <h2 className="text-xl font-semibold text-white">Recent Health Data</h2>
              <p className="text-dark-300">Latest system health metrics from your devices</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentHealthData.map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-4 bg-dark-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        metric.value >= 80 ? 'bg-green-500' :
                        metric.value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          Device: {metric.device_id}
                        </div>
                        <div className="text-sm text-dark-400">
                          {new Date(metric.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{metric.value}/100</div>
                      <div className="text-sm text-dark-400">Health Score</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-dark-800 rounded-lg border border-dark-700">
          <div className="px-6 py-4 border-b border-dark-700">
            <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
            <p className="text-dark-300">Get started with GridHealth monitoring</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link 
                href="/download" 
                className="flex items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="p-2 bg-blue-600 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Download Agent</h3>
                  <p className="text-sm text-dark-400">Get the GridHealth monitoring agent</p>
                </div>
              </Link>

              <Link 
                href="/licenses" 
                className="flex items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="p-2 bg-purple-600 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Manage Licenses</h3>
                  <p className="text-sm text-dark-400">View and manage your licenses</p>
                </div>
              </Link>

              <Link 
                href="/pricing" 
                className="flex items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="p-2 bg-green-600 rounded-lg mr-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Upgrade Plan</h3>
                  <p className="text-sm text-dark-400">Add more devices to your plan</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 