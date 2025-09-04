import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    // Only admins can access this endpoint
    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get license overview using the view
    const { data: licenses, error: licensesError } = await supabaseAdmin
      .from('admin_license_overview')
      .select('*')
      .order('created_at', { ascending: false })

    if (licensesError) {
      console.error('Error fetching license overview:', licensesError)
      return NextResponse.json({ error: 'Failed to fetch license overview' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      licenses: licenses || []
    })

  } catch (error) {
    console.error('Error in license overview API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
