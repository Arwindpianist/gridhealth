import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      first_name, 
      last_name, 
      phone, 
      account_type, 
      organization_name, 
      company_name, 
      description, 
      address, 
      contact_email, 
      contact_phone 
    } = body

    // Validate required fields
    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    // Update user profile
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        first_name,
        last_name,
        phone: phone || null
      })
      .eq('clerk_user_id', userId)

    if (userError) {
      console.error('Error updating user:', userError)
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
    }

    // Create organization/company if needed
    if (account_type === 'organization' && organization_name) {
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: organization_name,
          description: description || null,
          address: address || null,
          contact_email: contact_email || null,
          contact_phone: contact_phone || null
        })
        .select()
        .single()

      if (orgError) {
        console.error('Error creating organization:', orgError)
        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
      }

      // Get user ID from users table
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (userData) {
        // Assign user role to organization
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userData.id,
            organization_id: org.id,
            role: 'owner'
          })

        if (roleError) {
          console.error('Error assigning user role:', roleError)
          return NextResponse.json({ error: 'Failed to assign user role' }, { status: 500 })
        }
      }
    }

    if (account_type === 'company' && company_name) {
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: company_name,
          email: contact_email || null,
          phone: contact_phone || null,
          address: address || null
        })
        .select()
        .single()

      if (companyError) {
        console.error('Error creating company:', companyError)
        return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
      }

      // Get user ID from users table
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('clerk_user_id', userId)
        .single()

      if (userData) {
        // Assign user role to company
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userData.id,
            company_id: company.id,
            role: 'owner'
          })

        if (roleError) {
          console.error('Error assigning user role:', roleError)
          return NextResponse.json({ error: 'Failed to assign user role' }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding completed successfully' 
    })

  } catch (error) {
    console.error('Error in onboarding API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 