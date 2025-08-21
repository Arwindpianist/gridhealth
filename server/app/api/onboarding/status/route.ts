import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has completed onboarding by looking for basic profile info
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, phone')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !user) {
      console.log('❌ User not found in database, needs onboarding')
      return NextResponse.json({ 
        needsOnboarding: true,
        isComplete: false,
        missingFields: ['first_name', 'last_name', 'phone']
      })
    }

    // Check what fields are missing
    const missingFields: string[] = []
    if (!user.first_name) missingFields.push('first_name')
    if (!user.last_name) missingFields.push('last_name')
    // Phone is optional, so we won't require it
    
    // Check if user has a role assigned (indicating onboarding is complete)
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, organization_id, company_id')
      .eq('user_id', user.id)
      .single()

    if (roleError && roleError.code !== 'PGRST116') {
      console.error('❌ Error checking user role:', roleError)
      missingFields.push('role_assignment')
    } else if (!userRole) {
      console.log('❌ No user role found, needs onboarding')
      missingFields.push('role_assignment')
    } else {
      console.log('✅ User role found:', userRole.role)
    }

    const isComplete = missingFields.length === 0

    console.log('🔍 Onboarding status check:', {
      userId,
      hasFirstName: !!user.first_name,
      hasLastName: !!user.last_name,
      hasRole: !!userRole,
      missingFields,
      isComplete
    })

    return NextResponse.json({
      needsOnboarding: !isComplete,
      isComplete,
      missingFields,
      userRole: userRole ? userRole.role : null
    })

  } catch (error) {
    console.error('Error in onboarding status API:', error)
    return NextResponse.json({ 
      needsOnboarding: true,
      isComplete: false,
      missingFields: ['first_name', 'last_name', 'phone', 'role_assignment']
    })
  }
} 