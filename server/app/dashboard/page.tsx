import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '../../lib/supabase'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/')
  }

  // Check if user has completed onboarding
  let { data: user, error } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, phone, created_at')
    .eq('clerk_user_id', userId)
    .single()

  if (error || !user) {
    // Create a basic user profile if none exists
    console.log('⚠️ User not found in database, creating basic profile')
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        clerk_user_id: userId,
        first_name: 'User',
        last_name: 'Account',
        phone: null
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating user profile:', createError)
      // Continue anyway, don't block access
    } else {
      console.log('✅ Basic user profile created')
      user = newUser
      
      // Create a basic individual user role for the new user
      try {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: newUser.id,
            role: 'individual'
          })
        
        if (roleError) {
          console.error('❌ Error creating user role:', roleError)
        } else {
          console.log('✅ Basic user role created')
        }
      } catch (roleError) {
        console.error('❌ Exception creating user role:', roleError)
      }
    }
  }

  // Check if required fields are filled (phone is optional)
  const hasRequiredFields = user?.first_name && user?.last_name
  if (!hasRequiredFields) {
    console.log('⚠️ Missing required fields, but allowing dashboard access')
    // Don't redirect, allow access to dashboard
  }

  // Check if user has a role assigned (indicating onboarding is complete)
  const { data: userRole, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('role, organization_id, company_id')
    .eq('user_id', user?.id)
    .single()

  if (roleError && roleError.code !== 'PGRST116') {
    console.error('❌ Error checking user role:', roleError)
    // Don't redirect to onboarding for database errors, just log and continue
    console.log('⚠️ Database error, but continuing with basic dashboard access')
  }

  // Determine where user should be redirected based on role and profile
  let redirectPath = null

  if (userRole) {
    console.log('✅ User has role:', userRole.role)

    // If admin, allow access to both dashboard and admin pages
    if (userRole.role === 'admin') {
      console.log('👑 Admin user - can access both dashboard and admin pages')
      // Don't redirect, allow admin to choose
      redirectPath = null
    }

    // For individual users, they can access the dashboard immediately
    if (userRole.role === 'individual') {
      console.log('👤 Individual user, redirecting to complete dashboard')
      redirect('/dashboard/complete')
    }

    // For organization/company/owner users, check if they have licenses
    if (userRole.role === 'organization' || userRole.role === 'company' || userRole.role === 'owner') {
      console.log('🏢 Organization/Company user, checking licenses...')
      
      // Check if user has any active licenses
      const { data: licenses, error: licenseError } = await supabaseAdmin
        .from('licenses')
        .select('*')
        .eq('status', 'active')
        .or(`organization_id.eq.${userRole.organization_id},company_id.eq.${userRole.company_id}`)

      if (licenseError) {
        console.error('❌ Error checking licenses:', licenseError)
        // Don't redirect to onboarding for database errors
        console.log('⚠️ Database error, but continuing with basic dashboard access')
      } else if (licenses && licenses.length > 0) {
        console.log('✅ User has active licenses, redirecting to complete dashboard')
        redirect('/dashboard/complete')
      } else {
        console.log('⚠️ No active licenses found, redirecting to onboarding')
        redirect('/onboarding')
      }
    }
  } else {
    console.log('⚠️ No user role found, but user has basic profile info')
    console.log('🔄 This might indicate onboarding is in progress or incomplete')
    console.log('✅ Allowing dashboard access for license purchase')
    // Allow access to basic dashboard for license purchase
  }

  // Check if user has completed their profile
  const hasCompletedProfile = user?.first_name && user?.last_name && 
    (userRole?.role === 'individual' || 
     (userRole?.role === 'company' && userRole.company_id) ||
     (userRole?.role === 'organization' && userRole.organization_id) ||
     (userRole?.role === 'owner' && (userRole.organization_id || userRole.company_id)))

  if (hasCompletedProfile) {
    console.log('✅ User has completed profile, redirecting to complete dashboard')
    redirect('/dashboard/complete')
  }

  // If we get here, user has basic profile info but may not have completed full onboarding
  // Allow them to stay on the dashboard to purchase licenses
  console.log('✅ User can access dashboard for license purchase')

  // If we reach here, admin users can choose their path
  if (userRole?.role === 'admin') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-dark-800 rounded-lg border border-dark-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Welcome, Admin!</h1>
            <p className="text-dark-300">Choose where you'd like to go:</p>
          </div>
          
          <div className="space-y-4">
            <a 
              href="/admin" 
              className="w-full bg-gridhealth-600 hover:bg-gridhealth-700 text-white px-6 py-3 rounded-lg transition-colors block text-center font-medium"
            >
              👑 Admin Dashboard
            </a>
            
            <a 
              href="/dashboard/complete" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors block text-center font-medium"
            >
              🏢 Organization Dashboard
            </a>
            
            <p className="text-sm text-dark-400 text-center mt-4">
              You can access both views from the navigation menu
            </p>
          </div>
        </div>
      </div>
    )
  }

  // For other users, continue with normal flow
  if (redirectPath) {
    redirect(redirectPath)
  }

  // Return the dashboard content for new users
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome to GridHealth!</h1>
              <p className="text-dark-300">Get started with system health monitoring</p>
            </div>
            <div className="flex space-x-4">
              {/* Only show management button for admin users */}
              {userRole?.role === 'admin' && (
                <a 
                  href="/management" 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🎛️ Management
                </a>
              )}
              <a 
                href="/profile" 
                className="bg-gridhealth-600 hover:bg-gridhealth-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Complete Profile
              </a>
              <a 
                href="/licenses" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Get License
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-gridhealth-600 to-gridhealth-800 rounded-lg p-8 mb-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              🚀 Welcome to GridHealth!
            </h2>
            <p className="text-xl text-gridhealth-100 mb-6">
              You're just a few steps away from monitoring your system health
            </p>
            <div className="flex justify-center space-x-4">
              <a 
                href="/profile" 
                className="bg-white text-gridhealth-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Complete Your Profile
              </a>
              <a 
                href="/download" 
                className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-gridhealth-600 transition-colors"
              >
                Download Agent
              </a>
            </div>
          </div>
        </div>

        {/* Quick Start Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Complete Profile</h3>
              <p className="text-gray-400 text-sm">
                Tell us about yourself and your organization to get started
              </p>
              <a 
                href="/profile" 
                className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium"
              >
                Get Started →
              </a>
            </div>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Get License</h3>
              <p className="text-gray-400 text-sm">
                Choose a plan that fits your monitoring needs
              </p>
              <a 
                href="/licenses" 
                className="inline-block mt-4 text-green-400 hover:text-green-300 text-sm font-medium"
              >
                View Plans →
              </a>
            </div>
          </div>

          <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Download Agent</h3>
              <p className="text-gray-400 text-sm">
                Install the monitoring agent on your systems
              </p>
              <a 
                href="/download" 
                className="inline-block mt-4 text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                Download →
              </a>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="bg-dark-800 rounded-lg p-6 border border-dark-700">
          <h3 className="text-xl font-semibold text-white mb-4">What You'll Get</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-green-500 rounded-full mt-1"></div>
              <div>
                <h4 className="text-white font-medium">Real-time Monitoring</h4>
                <p className="text-gray-400 text-sm">Track CPU, memory, disk, and network usage</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-green-500 rounded-full mt-1"></div>
              <div>
                <h4 className="text-white font-medium">Health Scoring</h4>
                <p className="text-gray-400 text-sm">Get instant health scores for your systems</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-green-500 rounded-full mt-1"></div>
              <div>
                <h4 className="text-white font-medium">Device Management</h4>
                <p className="text-gray-400 text-sm">Monitor multiple devices from one dashboard</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-green-500 rounded-full mt-1"></div>
              <div>
                <h4 className="text-white font-medium">Alerts & Notifications</h4>
                <p className="text-gray-400 text-sm">Stay informed about system issues</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 