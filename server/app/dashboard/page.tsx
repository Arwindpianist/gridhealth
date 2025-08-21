import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '../../lib/supabase'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/')
  }

  try {
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

    if (userRole) {
      console.log('✅ User has role:', userRole.role)

      // If admin, redirect to admin dashboard
      if (userRole.role === 'admin') {
        redirect('/admin')
      }

      // For individual users, they can access the dashboard immediately
      if (userRole.role === 'individual') {
        console.log('👤 Individual user, redirecting to complete dashboard')
        redirect('/dashboard/complete')
      }

      // For organization/company users, check if they have licenses
      const organizationId = userRole.organization_id || userRole.company_id
      if (organizationId) {
        const { data: userLicenses } = await supabaseAdmin
          .from('licenses')
          .select('id')
          .eq('organization_id', organizationId)
          .limit(1)

        if (userLicenses && userLicenses.length > 0) {
          console.log('✅ Organization has licenses, redirecting to complete dashboard')
          redirect('/dashboard/complete')
        } else {
          console.log('❌ Organization has no licenses, staying on dashboard for license purchase')
          // Don't redirect, let them stay on dashboard to purchase licenses
        }
      }
    } else {
      console.log('⚠️ No user role found, but user has basic profile info')
      console.log('🔄 This might indicate onboarding is in progress or incomplete')
      console.log('✅ Allowing dashboard access for license purchase')
      // Allow access to basic dashboard for license purchase
    }

    // If we get here, user has basic profile info but may not have completed full onboarding
    // Allow them to stay on the dashboard to purchase licenses
    console.log('✅ User can access dashboard for license purchase')

  } catch (error) {
    console.error('Error checking user status:', error)
    // Don't redirect to onboarding, allow access to dashboard
    console.log('⚠️ Error occurred, but allowing dashboard access')
  }
} 