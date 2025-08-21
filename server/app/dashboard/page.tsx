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
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, phone')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !user) {
      redirect('/onboarding')
    }

    // Check if required fields are filled (phone is optional)
    const hasRequiredFields = user.first_name && user.last_name
    if (!hasRequiredFields) {
      console.log('❌ Missing required fields, redirecting to onboarding')
      redirect('/onboarding')
    }

    // Check if user has a role assigned (indicating onboarding is complete)
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, organization_id, company_id')
      .eq('user_id', user.id)
      .single()

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('❌ Error checking user role:', roleError)
      redirect('/onboarding')
    }

    if (!userRole) {
      console.log('❌ No user role found, redirecting to onboarding')
      redirect('/onboarding')
    }

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

    // If admin, redirect to admin dashboard
    if (userRole.role === 'admin') {
      redirect('/admin')
    }

    // If regular user with completed onboarding, redirect to complete dashboard
    redirect('/dashboard/complete')

  } catch (error) {
    console.error('Error checking user status:', error)
    redirect('/onboarding')
  }
} 