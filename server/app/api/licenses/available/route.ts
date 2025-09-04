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

    // Get user's organization/company
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, company_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    const organizationId = userRole.organization_id || userRole.company_id

    // Build query based on user role
    let query = supabaseAdmin
      .from('licenses')
      .select('license_key, device_limit, status, payment_status')
      .eq('status', 'active')
      .eq('payment_status', 'paid')

    // If user is admin, get all licenses, otherwise filter by organization
    if (userRole.role !== 'admin') {
      query = query.eq('organization_id', organizationId)
    }

    const { data: licenses, error: licensesError } = await query

    if (licensesError) {
      console.error('Error fetching available licenses:', licensesError)
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      licenses: licenses || []
    })

  } catch (error) {
    console.error('Error in available licenses API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
