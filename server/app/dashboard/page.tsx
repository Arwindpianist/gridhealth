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

    // Check if required fields are filled
    const hasRequiredFields = user.first_name && user.last_name && user.phone
    if (!hasRequiredFields) {
      redirect('/onboarding')
    }

    // Check if user is admin
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    // If admin, redirect to admin dashboard
    if (userRole) {
      redirect('/admin')
    }

    // If regular user with completed onboarding, redirect to complete dashboard
    redirect('/dashboard/complete')

  } catch (error) {
    console.error('Error checking user status:', error)
    redirect('/onboarding')
  }
} 