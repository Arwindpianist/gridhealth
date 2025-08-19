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
      .select('first_name, last_name, phone')
      .eq('clerk_user_id', userId)
      .single()

    if (error) {
      console.error('Error checking user status:', error)
      return NextResponse.json({ 
        needsOnboarding: true,
        isComplete: false,
        missingFields: ['first_name', 'last_name', 'phone']
      })
    }

    if (!user) {
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
    if (!user.phone) missingFields.push('phone')

    const isComplete = missingFields.length === 0

    return NextResponse.json({
      needsOnboarding: !isComplete,
      isComplete,
      missingFields
    })

  } catch (error) {
    console.error('Error in onboarding status API:', error)
    return NextResponse.json({ 
      needsOnboarding: true,
      isComplete: false,
      missingFields: ['first_name', 'last_name', 'phone']
    })
  }
} 