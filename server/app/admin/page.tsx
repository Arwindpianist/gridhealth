import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '../../lib/supabase'
import Link from 'next/link'

async function getAdminData() {
  try {
    // Fetch comprehensive system statistics
    const [
      { count: totalUsers },
      { count: totalOrganizations },
      { count: totalCompanies },
      { count: totalDevices },
      { count: totalLicenses }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('devices').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('licenses').select('*', { count: 'exact', head: true })
    ])

    // Fetch all organizations with their details
    const { data: organizations } = await supabaseAdmin
      .from('organizations')
      .select(`
        *,
        user_roles!inner(role),
        licenses(count),
        devices(count)
      `)
      .order('created_at', { ascending: false })

    // Fetch all companies with their details
    const { data: companies } = await supabaseAdmin
      .from('companies')
      .select(`
        *,
        user_roles!inner(role),
        devices(count)
      `)
      .order('created_at', { ascending: false })

    // Calculate recurring revenue (MYR 11 per device per 3 months)
    const activeLicenses = await supabaseAdmin
      .from('licenses')
      .select('device_limit, status')
      .eq('status', 'active')

    const totalDeviceLimit = activeLicenses.data?.reduce((sum, license) => sum + license.device_limit, 0) || 0
    const monthlyRevenue = (totalDeviceLimit * 11) / 3 // MYR 11 per device per 3 months
    const annualRevenue = monthlyRevenue * 12

    return {
      totalUsers: totalUsers || 0,
      totalOrganizations: totalOrganizations || 0,
      totalCompanies: totalCompanies || 0,
      totalDevices: totalDevices || 0,
      totalLicenses: totalLicenses || 0,
      organizations: organizations || [],
      companies: companies || [],
      totalDeviceLimit,
      monthlyRevenue,
      annualRevenue
    }
  } catch (error) {
    console.error('Error fetching admin data:', error)
    return null
  }
}

export default async function AdminPage() {
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

  const adminData = await getAdminData()
  
  if (!adminData) {
    redirect('/dashboard')
  }

  const { 
    totalUsers, 
    totalOrganizations, 
    totalCompanies, 
    totalDevices, 
    totalLicenses,
    organizations,
    companies,
    totalDeviceLimit,
    monthlyRevenue,
    annualRevenue
  } = adminData

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="gradient-text">Admin Dashboard</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              System administration and comprehensive platform overview for GridHealth
            </p>
          </div>

          {/* System Statistics */}
          <div className="grid md:grid-cols-5 gap-6 mb-12">
            <div className="card text-center">
              <div className="text-3xl font-bold text-gridhealth-400 mb-2">{totalUsers}</div>
              <div className="text-gray-400">Total Users</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-primary-400 mb-2">{totalOrganizations}</div>
              <div className="text-gray-400">Organizations</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{totalCompanies}</div>
              <div className="text-gray-400">Companies</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{totalDevices}</div>
              <div className="text-gray-400">Active Devices</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">{totalLicenses}</div>
              <div className="text-gray-400">Active Licenses</div>
            </div>
          </div>

          {/* Revenue Overview */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{totalDeviceLimit}</div>
              <div className="text-gray-400">Total Device Limit</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">MYR {monthlyRevenue.toFixed(2)}</div>
              <div className="text-gray-400">Monthly Revenue</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">MYR {annualRevenue.toFixed(2)}</div>
              <div className="text-gray-400">Annual Revenue</div>
            </div>
          </div>

          {/* Organizations Overview */}
          <div className="card mb-8">
            <h3 className="text-2xl font-semibold text-white mb-6">Organizations Overview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-dark-600">
                  <tr>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Name</th>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Status</th>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Device Limit</th>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Licenses</th>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Devices</th>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id} className="border-b border-dark-700 hover:bg-dark-800">
                      <td className="py-3 px-4 text-white">{org.name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          org.subscription_status === 'active' ? 'bg-green-500/20 text-green-400' :
                          org.subscription_status === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {org.subscription_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{org.device_limit}</td>
                      <td className="py-3 px-4 text-gray-300">{org.licenses?.[0]?.count || 0}</td>
                      <td className="py-3 px-4 text-gray-300">{org.devices?.[0]?.count || 0}</td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Companies Overview */}
          <div className="card mb-8">
            <h3 className="text-2xl font-semibold text-white mb-6">Companies Overview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-dark-600">
                  <tr>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Name</th>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Email</th>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Phone</th>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Devices</th>
                    <th className="py-3 px-4 text-gray-300 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr key={company.id} className="border-b border-dark-700 hover:bg-dark-800">
                      <td className="py-3 px-4 text-white">{company.name}</td>
                      <td className="py-3 px-4 text-gray-300">{company.email || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-300">{company.phone || 'N/A'}</td>
                      <td className="py-3 px-4 text-gray-300">{company.devices?.[0]?.count || 0}</td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(company.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">User Management</h3>
              <div className="space-y-3">
                <Link href="/admin/users" className="w-full btn-primary py-3 block text-center">
                  👤 View All Users
                </Link>
                <Link href="/admin/users/create" className="w-full btn-secondary py-3 block text-center">
                  ➕ Create New User
                </Link>
                <Link href="/admin/users/analytics" className="w-full btn-outline py-3 block text-center">
                  📊 User Analytics
                </Link>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Organization Management</h3>
              <div className="space-y-3">
                <Link href="/admin/organizations" className="w-full btn-primary py-3 block text-center">
                  🏢 Manage Organizations
                </Link>
                <Link href="/admin/organizations/create" className="w-full btn-secondary py-3 block text-center">
                  ➕ Create Organization
                </Link>
                <Link href="/admin/licenses" className="w-full btn-outline py-3 block text-center">
                  📋 License Management
                </Link>
              </div>
            </div>
          </div>

          {/* System Management */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Company Management</h3>
              <div className="space-y-3">
                <Link href="/admin/companies" className="w-full btn-primary py-3 block text-center">
                  🏢 Manage Companies
                </Link>
                <Link href="/admin/companies/create" className="w-full btn-secondary py-3 block text-center">
                  ➕ Create Company
                </Link>
                <Link href="/admin/billing" className="w-full btn-outline py-3 block text-center">
                  💰 Billing Overview
                </Link>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">System Administration</h3>
              <div className="space-y-3">
                <Link href="/admin/settings" className="w-full btn-primary py-3 block text-center">
                  ⚙️ System Settings
                </Link>
                <Link href="/admin/analytics" className="w-full btn-secondary py-3 block text-center">
                  📊 System Analytics
                </Link>
                <Link href="/admin/security" className="w-full btn-outline py-3 block text-center">
                  🔒 Security Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 