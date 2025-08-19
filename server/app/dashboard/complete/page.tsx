import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '../../../lib/supabase'

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

    // Get devices for user's organizations
    const { data: devices } = await supabaseAdmin
      .from('devices')
      .select('*')
      .in('organization_id', orgIds)

    // Get health metrics for user's devices
    const deviceIds = devices?.map(d => d.id) || []
    const { data: healthMetrics } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .in('device_id', deviceIds)
      .limit(10)

    return {
      user,
      roles: roles || [],
      organizations: organizations || [],
      companies: companies || [],
      licenses: licenses || [],
      devices: devices || [],
      healthMetrics: healthMetrics || [],
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

  const { user, organizations, companies, licenses, devices, healthMetrics, isIndividual } = dashboardData
  
  // Calculate stats
  const totalDevices = devices.length
  const activeDevices = devices.filter(d => d.status === 'active').length
  const totalLicenses = licenses.length
  const totalDeviceLimit = licenses.reduce((sum, license) => sum + license.device_limit, 0)
  const availableDevices = totalDeviceLimit - totalDevices

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Welcome to <span className="gradient-text">GridHealth Dashboard</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Monitor your systems, view health metrics, and manage your devices from one central location.
            </p>
          </div>

          {/* Dashboard Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="card text-center">
              <div className="text-3xl font-bold text-gridhealth-400 mb-2">{activeDevices}</div>
              <div className="text-gray-400">Active Devices</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-primary-400 mb-2">{totalLicenses}</div>
              <div className="text-gray-400">Active Licenses</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{availableDevices}</div>
              <div className="text-gray-400">Available Devices</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{totalDeviceLimit}</div>
              <div className="text-gray-400">Total Device Limit</div>
            </div>
          </div>

          {/* License Information */}
          {licenses.length > 0 ? (
            <div className="card mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">Your Licenses</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {licenses.map((license) => (
                  <div key={license.id} className="p-4 bg-dark-800 rounded-lg border border-dark-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-400">{license.tier}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        license.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {license.status}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{license.device_limit}</div>
                    <div className="text-sm text-gray-400">Device Limit</div>
                    <div className="text-xs text-gray-500 mt-2">
                      Expires: {new Date(license.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card mb-8 text-center">
              <div className="text-6xl mb-6">🔑</div>
              <h2 className="text-2xl font-bold text-white mb-4">No Licenses Found</h2>
              <p className="text-gray-400 mb-6">
                {isIndividual 
                  ? 'As an individual user, you can start monitoring your personal devices immediately. Purchase a license to unlock advanced features.'
                  : 'You need a license to start monitoring devices. Choose a plan that fits your needs.'
                }
              </p>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {[
                  { tier: 'Basic', devices: 10, price: 'MYR 11', color: 'from-blue-500 to-blue-600' },
                  { tier: 'Standard', devices: 50, price: 'MYR 11', color: 'from-purple-500 to-purple-600' },
                  { tier: 'Professional', devices: 100, price: 'MYR 11', color: 'from-green-500 to-green-600' },
                  { tier: 'Enterprise', devices: 500, price: 'MYR 11', color: 'from-orange-500 to-orange-600' }
                ].map((plan) => (
                  <div key={plan.tier} className="p-4 bg-dark-800 rounded-lg border border-dark-700 hover:border-gridhealth-500/50 transition-all">
                    <h3 className="text-lg font-semibold text-white mb-2">{plan.tier}</h3>
                    <div className="text-2xl font-bold text-gridhealth-400 mb-1">{plan.devices}</div>
                    <div className="text-sm text-gray-400 mb-3">Devices</div>
                    <div className="text-lg font-bold text-white mb-3">{plan.price}</div>
                    <div className="text-xs text-gray-500">per 3 months</div>
                    <Link 
                      href={`/pricing?tier=${plan.tier.toLowerCase()}`}
                      className="w-full mt-3 py-2 px-4 bg-gradient-to-r from-gridhealth-500 to-primary-500 text-white rounded-lg hover:from-gridhealth-600 hover:to-primary-600 transition-all font-medium block text-center"
                    >
                      Select Plan
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-4">
                <Link href="/download" className="btn-primary w-full py-4 text-center text-lg font-semibold">
                  📥 Download GridHealth Agent
                </Link>
                <Link href="/licenses" className="btn-secondary w-full py-4 text-center text-lg font-semibold">
                  🔑 Manage Licenses
                </Link>
                {licenses.length === 0 ? (
                  <Link href="/pricing" className="btn-outline w-full py-4 text-center text-lg font-semibold">
                    {isIndividual ? '💳 Get Premium Features' : '💳 Purchase License'}
                  </Link>
                ) : (
                  <Link href="/pricing" className="btn-outline w-full py-4 text-center text-lg font-semibold">
                    🚀 Upgrade License
                  </Link>
                )}
                {isIndividual && (
                  <Link href="/download" className="btn-outline w-full py-4 text-center text-lg font-semibold">
                    🚀 Start Monitoring Now
                  </Link>
                )}
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
              {healthMetrics.length > 0 ? (
                <div className="space-y-3">
                  {healthMetrics.slice(0, 5).map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                      <div>
                        <div className="text-white font-medium">{metric.metric_type}</div>
                        <div className="text-sm text-gray-400">{metric.value} {metric.unit}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  <div className="text-6xl mb-4">📊</div>
                  <p>No recent activity</p>
                  <p className="text-sm">Start monitoring devices to see activity here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 