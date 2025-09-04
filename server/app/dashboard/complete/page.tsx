import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '../../../lib/supabase'
import { calculateHealthScore, getOrganizationHealthSummary, getDeviceHealthData } from '../../../lib/healthMetrics'
import { generateOrganizationReportCSV } from '../../../lib/reportGenerator'
import DevicesByGroups from '../../components/DevicesByGroups'

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
                href="/download" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Agent
              </Link>
              {/* Show Management button for admin/owner users */}
              {(roles.some(r => r.role === 'admin') || roles.some(r => r.role === 'owner') || 
                roles.some(r => r.role === 'organization') || roles.some(r => r.role === 'company')) && (
                <Link 
                  href="/management" 
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
                >
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Management
                </Link>
              )}
              {/* License Management dropdown */}
              <div className="relative group">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center">
                  <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Licenses
                  <svg className="w-4 h-4 ml-2 transition-transform group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-dark-800 border border-dark-600 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link 
                    href="/licenses" 
                    className="block px-4 py-3 text-sm text-white hover:bg-dark-700 rounded-t-lg transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      View Licenses
                    </div>
                  </Link>
                  <Link 
                    href="/enquiry" 
                    className="block px-4 py-3 text-sm text-white hover:bg-dark-700 rounded-b-lg transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Request New License
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl border border-blue-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm font-medium">Total Devices</p>
                <p className="text-2xl font-bold text-white">{totalDevices}</p>
                <p className="text-blue-300 text-sm">{onlineDevices} online • {offlineDevices} offline</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl border border-green-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm font-medium">System Health</p>
                <p className="text-2xl font-bold text-white">{averageHealthScore}%</p>
                <p className="text-green-300 text-sm">{healthyDevices} healthy • {warningDevices} warning</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-2xl border border-orange-500/30 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-300 text-sm font-medium">Critical Alerts</p>
                <p className="text-2xl font-bold text-white">{criticalDevices}</p>
                <p className="text-orange-300 text-sm">{warningDevices + criticalDevices} total alerts</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Devices Overview with Groups */}
        <DevicesByGroups />

        {/* Quick Actions */}
        <div className="mt-8 bg-gradient-to-br from-dark-800 to-dark-700 rounded-2xl border border-dark-600/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-sm text-dark-400">Get the GridHealth monitoring agent for your devices</p>
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
                <h4 className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">Account Settings</h4>
                <p className="text-sm text-dark-400">Manage your profile and preferences</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 