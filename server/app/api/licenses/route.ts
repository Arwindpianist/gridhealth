import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Fetching licenses for user:', userId)

    // Get user data
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userError || !user) {
      console.error('❌ User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's organization through user_roles
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole?.organization_id) {
      console.error('❌ User role not found:', roleError)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', userRole.organization_id)
      .single()

    if (orgError) {
      console.error('❌ Organization not found:', orgError)
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get licenses for the organization
    const { data: licenses, error: licensesError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('organization_id', userRole.organization_id)
      .order('created_at', { ascending: false })

    if (licensesError) {
      console.error('❌ Error fetching licenses:', licensesError)
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
    }

    console.log('✅ Licenses fetched successfully:', licenses?.length || 0)

    return NextResponse.json({
      success: true,
      licenses: licenses || [],
      organization: {
        id: organization.id,
        name: organization.name,
        subscription_status: organization.subscription_status || 'inactive',
        subscription_tier: organization.subscription_tier || null,
        device_limit: organization.device_limit || 0
      }
    })

  } catch (error) {
    console.error('💥 Error in licenses API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 