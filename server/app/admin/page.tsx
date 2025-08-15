import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '../../lib/supabase'

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

  // Fetch system statistics
  const [
    { count: totalUsers },
    { count: totalOrganizations },
    { count: totalCompanies },
    { count: totalDevices }
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('organizations').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('companies').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('devices').select('*', { count: 'exact', head: true })
  ])

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
              System administration and user management for GridHealth platform
            </p>
          </div>

          {/* System Statistics */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="card text-center">
              <div className="text-3xl font-bold text-gridhealth-400 mb-2">{totalUsers || 0}</div>
              <div className="text-gray-400">Total Users</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-primary-400 mb-2">{totalOrganizations || 0}</div>
              <div className="text-gray-400">Organizations</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">{totalCompanies || 0}</div>
              <div className="text-gray-400">Companies</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">{totalDevices || 0}</div>
              <div className="text-gray-400">Active Devices</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">User Management</h3>
              <div className="space-y-3">
                <button className="w-full btn-primary py-3">
                  👤 Create New User
                </button>
                <button className="w-full btn-secondary py-3">
                  🔍 View All Users
                </button>
                <button className="w-full btn-outline py-3">
                  📊 User Analytics
                </button>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Organization Management</h3>
              <div className="space-y-3">
                <button className="w-full btn-primary py-3">
                  🏢 Create Organization
                </button>
                <button className="w-full btn-secondary py-3">
                  🏢 Manage Organizations
                </button>
                <button className="w-full btn-outline py-3">
                  📋 License Management
                </button>
              </div>
            </div>
          </div>

          {/* System Management */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Company Management</h3>
              <div className="space-y-3">
                <button className="w-full btn-primary py-3">
                  🏢 Create Company
                </button>
                <button className="w-full btn-secondary py-3">
                  🏢 Manage Companies
                </button>
                <button className="w-full btn-outline py-3">
                  💰 Billing Overview
                </button>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">System Administration</h3>
              <div className="space-y-3">
                <button className="w-full btn-primary py-3">
                  ⚙️ System Settings
                </button>
                <button className="w-full btn-secondary py-3">
                  📊 System Analytics
                </button>
                <button className="w-full btn-outline py-3">
                  🔒 Security Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 