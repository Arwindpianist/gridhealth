import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '../../../lib/supabase'

async function getOrganizationViewData() {
  try {
    // Get sample organization data to show what organization owners see
    const { data: sampleOrganizations } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .neq('subscription_status', 'admin')
      .limit(3)

    // Get sample devices
    const { data: sampleDevices } = await supabaseAdmin
      .from('devices')
      .select('*')
      .limit(10)

    // Get sample health metrics
    const { data: sampleHealthMetrics } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20)

    // Get sample licenses
    const { data: sampleLicenses } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('status', 'active')
      .limit(5)

    return {
      sampleOrganizations: sampleOrganizations || [],
      sampleDevices: sampleDevices || [],
      sampleHealthMetrics: sampleHealthMetrics || [],
      sampleLicenses: sampleLicenses || []
    }
  } catch (error) {
    console.error('Error fetching organization view data:', error)
    return null
  }
}

export default async function AdminOrganizationViewPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/')
  }

  // Check if user is admin
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('clerk_user_id', userId)
    .single()

  if (!user) {
    redirect('/')
  }

  const { data: userRole } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single()

  if (!userRole) {
    redirect('/dashboard')
  }

  const organizationData = await getOrganizationViewData()
  
  if (!organizationData) {
    redirect('/admin')
  }

  const { sampleOrganizations, sampleDevices, sampleHealthMetrics, sampleLicenses } = organizationData

  // Calculate sample stats
  const totalDevices = sampleDevices.length
  const activeDevices = sampleDevices.filter(d => d.is_active).length
  const totalLicenses = sampleLicenses.length
  const totalDeviceLimit = sampleLicenses.reduce((sum, license) => sum + license.device_limit, 0)
  const availableDevices = totalDeviceLimit - totalDevices

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        
        {/* Breadcrumb Navigation */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-8">
            <Link href="/admin" className="hover:text-white transition-colors">
              👑 Admin
            </Link>
            <span>/</span>
            <span className="text-white">Organization View</span>
          </nav>
          
          {/* Quick Navigation Menu */}
          <div className="flex justify-end mb-4">
            <div className="flex space-x-2">
              <Link 
                href="/admin" 
                className="bg-gridhealth-600 hover:bg-gridhealth-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                👑 Admin Dashboard
              </Link>
              <Link 
                href="/admin/organization-view" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm border-2 border-blue-400"
              >
                🏢 Organization View
              </Link>
            </div>
          </div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="gradient-text">Organization Dashboard View</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              This is what organization owners see in their dashboard
            </p>
            
            {/* Admin Navigation Options */}
            <div className="mt-8 flex justify-center space-x-4">
              <Link 
                href="/admin" 
                className="bg-gridhealth-600 hover:bg-gridhealth-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
              >
                👑 Back to Admin View
              </Link>
              <Link 
                href="/admin/organization-view" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium border-2 border-blue-500"
              >
                🏢 Organization View (Current)
              </Link>
            </div>
          </div>

          {/* Organization Statistics */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="card text-center">
              <div className="text-3xl font-bold text-gridhealth-400 mb-2">{totalDevices}</div>
              <div className="text-gray-400">Total Devices</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{activeDevices}</div>
              <div className="text-gray-400">Active Devices</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">{totalLicenses}</div>
              <div className="text-gray-400">Active Licenses</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{availableDevices}</div>
              <div className="text-gray-400">Available Slots</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Sample Organizations */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Sample Organizations</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {sampleOrganizations.map((org) => (
              <div key={org.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">{org.name}</h3>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    {org.subscription_status}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Device Limit: {org.device_limit}</p>
                  <p>Created: {new Date(org.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Devices */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Sample Devices</h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-dark-700">
                <thead className="bg-dark-800">
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
                  </tr>
                </thead>
                <tbody className="bg-dark-800 divide-y divide-dark-700">
                  {sampleDevices.map((device) => (
                    <tr key={device.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">{device.device_name}</div>
                          <div className="text-sm text-gray-400">{device.hostname}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {device.os_name} {device.os_version}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          device.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {device.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(device.last_seen).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sample Health Metrics */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Health Data</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {sampleHealthMetrics.slice(0, 6).map((metric) => (
              <div key={metric.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Device: {metric.device_id?.substring(0, 8)}...</span>
                  <span className="text-xs text-gray-500">
                    {new Date(metric.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-lg font-semibold text-white">
                  {metric.metric_type === 'heartbeat' ? '💓 Heartbeat' : '📊 Health Check'}
                </div>
                <div className="text-sm text-gray-400">
                  Value: {metric.value || 'N/A'} {metric.unit || ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Licenses */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Sample Licenses</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {sampleLicenses.map((license) => (
              <div key={license.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    {license.license_key?.substring(0, 20)}...
                  </h3>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    {license.status}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  <p>Device Limit: {license.device_limit}</p>
                  <p>Expires: {license.expires_at ? new Date(license.expires_at).toLocaleDateString() : 'Never'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* View Comparison */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Admin vs Organization View</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card bg-gridhealth-900 border-gridhealth-700">
              <h3 className="text-lg font-semibold text-white mb-4">👑 Admin View</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• System-wide statistics</li>
                <li>• All organizations and companies</li>
                <li>• Revenue calculations</li>
                <li>• Platform overview</li>
                <li>• Administrative controls</li>
              </ul>
            </div>
            <div className="card bg-blue-900 border-blue-700">
              <h3 className="text-lg font-semibold text-white mb-4">🏢 Organization View</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• Organization-specific data</li>
                <li>• Own devices and licenses</li>
                <li>• Health monitoring</li>
                <li>• Device management</li>
                <li>• License usage</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Information Box */}
        <div className="card bg-blue-900 border-blue-700">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Admin Information</h3>
            <p className="text-blue-200">
              This view shows you exactly what organization owners see in their dashboard. 
              Use this to understand the user experience and troubleshoot any issues they might report.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 