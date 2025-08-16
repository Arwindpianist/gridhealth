import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { supabaseAdmin } from '../../../../lib/supabase'

// Clerk webhook secret for verification
const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headersList = await headers()
    const svix_id = headersList.get('svix-id')
    const svix_timestamp = headersList.get('svix-timestamp')
    const svix_signature = headersList.get('svix-signature')

    // TODO: Verify webhook signature for production
    // For now, we'll trust the webhook (add verification in production)

    const { type, data } = body as { type: string; data: any }

    console.log('📨 Clerk webhook received:', { type, userId: data?.id })

    switch (type) {
      case 'user.created':
        await handleUserCreated(data)
        break
      
      case 'user.updated':
        await handleUserUpdated(data)
        break
      
      case 'user.deleted':
        await handleUserDeleted(data)
        break
      
      default:
        console.log('⚠️ Unhandled webhook type:', type)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Clerk webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleUserCreated(userData: any) {
  try {
    console.log('👤 Creating user in Supabase:', userData.id)
    console.log('📅 Clerk created_at value:', userData.created_at, 'Type:', typeof userData.created_at)

    // Extract user information from Clerk
    const {
      id: clerkUserId,
      email_addresses,
      first_name,
      last_name,
      phone_numbers,
      created_at
    } = userData

    const primaryEmail = email_addresses?.[0]?.email_address
    const primaryPhone = phone_numbers?.[0]?.phone_number

    // Create user record in Supabase
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        clerk_user_id: clerkUserId,
        email: primaryEmail,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: primaryPhone || null,
        created_at: new Date().toISOString() // Use current timestamp instead of Clerk's
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to create user in Supabase:', error)
      throw error
    }

    console.log('✅ User created in Supabase:', user.id)

    // TODO: Send welcome email and prompt for organization/company selection
    // This could be a separate API call or email service integration

  } catch (error) {
    console.error('❌ Error handling user creation:', error)
    throw error
  }
}

async function handleUserUpdated(userData: any) {
  try {
    console.log('👤 Updating user in Supabase:', userData.id)

    const {
      id: clerkUserId,
      email_addresses,
      first_name,
      last_name,
      phone_numbers,
      updated_at
    } = userData

    const primaryEmail = email_addresses?.[0]?.email_address
    const primaryPhone = phone_numbers?.[0]?.phone_number

    // Update user record in Supabase
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        email: primaryEmail,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: primaryPhone || null,
        updated_at: new Date().toISOString() // Use current timestamp instead of Clerk's
      })
      .eq('clerk_user_id', clerkUserId)

    if (error) {
      console.error('❌ Failed to update user in Supabase:', error)
      throw error
    }

    console.log('✅ User updated in Supabase:', clerkUserId)

  } catch (error) {
    console.error('❌ Error handling user update:', error)
    throw error
    }
}

async function handleUserDeleted(userData: any) {
  try {
    console.log('👤 Deleting user from Supabase:', userData.id)

    // Delete user record from Supabase
    // Note: This will cascade delete related records due to foreign key constraints
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('clerk_user_id', userData.id)

    if (error) {
      console.error('❌ Failed to delete user from Supabase:', error)
      throw error
    }

    console.log('✅ User deleted from Supabase:', userData.id)

  } catch (error) {
    console.error('❌ Error handling user deletion:', error)
    throw error
  }
} 