import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../lib/supabase'
import { sendEmailNotification } from '../../../lib/email'
import { checkCriticalHealth } from '../../../lib/notificationUtils'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (!userRole?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get notifications for the organization
    const { data: notifications, error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('organization_id', userRole.organization_id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      notifications: notifications || []
    })

  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, title, message, device_id, health_score, user_id } = body

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user's organization
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', userId)
      .single()

    if (!userRole?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Create notification record
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert([{
        organization_id: userRole.organization_id,
        user_id: user_id || null,
        type,
        title,
        message,
        device_id: device_id || null,
        health_score: health_score || null,
        status: 'pending'
      }])
      .select()
      .single()

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // If a specific user is specified, send email notification
    if (user_id) {
      try {
        await sendEmailNotification(
          user_id, // This should be an email address
          title,
          message,
          type === 'critical_health' ? 'critical_health' : 'general',
          {
            deviceName: device_id ? 'Device' : undefined,
            deviceId: device_id,
            healthScore: health_score
          }
        )

        // Update notification status
        await supabaseAdmin
          .from('notifications')
          .update({ 
            status: 'sent',
            email_sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)

      } catch (emailError) {
        console.error('Error sending email notification:', emailError)
        
        // Update notification status to failed
        await supabaseAdmin
          .from('notifications')
          .update({ 
            status: 'failed',
            email_sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)
      }
    }

    // Check for critical health issues
    await checkCriticalHealth(userRole.organization_id)

    return NextResponse.json({
      success: true,
      notification,
      message: 'Notification created successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
