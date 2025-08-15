import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/')
  }

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
              <div className="text-3xl font-bold text-gridhealth-400 mb-2">0</div>
              <div className="text-gray-400">Active Devices</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-primary-400 mb-2">0</div>
              <div className="text-gray-400">Organizations</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-green-400 mb-2">0</div>
              <div className="text-gray-400">Alerts</div>
            </div>
            <div className="card text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2">0</div>
              <div className="text-gray-400">Warnings</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-8">
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full btn-primary py-3">
                  📥 Download GridHealth Agent
                </button>
                <button className="w-full btn-secondary py-3">
                  📊 View System Health
                </button>
                <button className="w-full btn-outline py-3">
                  ⚙️ Configure Alerts
                </button>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
              <div className="text-gray-400 text-center py-8">
                <div className="text-6xl mb-4">📊</div>
                <p>No recent activity</p>
                <p className="text-sm">Start monitoring devices to see activity here</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 