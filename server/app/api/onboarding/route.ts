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

    console.log('📝 Onboarding request received:', {
      userId,
      account_type,
      organization_name,
      company_name,
      first_name,
      last_name
    })

    // Validate required fields
    if (!first_name || !last_name) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    // Update user profile
    console.log('👤 Updating user profile for:', userId)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        first_name,
        last_name,
        phone: phone || null
      })
      .eq('clerk_user_id', userId)

    if (userError) {
      console.error('❌ Error updating user:', userError)
      return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
    }
    console.log('✅ User profile updated successfully')

    // Create organization/company if needed
    if (account_type === 'organization' && organization_name) {
      console.log('🏢 Creating organization:', organization_name)
      
      try {
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
          console.error('❌ Error creating organization:', orgError)
          return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
        }
        console.log('✅ Organization created:', org.id)

        // Get user ID from users table
        const { data: userData, error: userDataError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        if (userDataError) {
          console.error('❌ Error getting user data:', userDataError)
          return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 })
        }

        if (userData) {
          console.log('👥 Assigning user role for organization. User ID:', userData.id, 'Org ID:', org.id)
          
          // Assign user role to organization
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userData.id,
              organization_id: org.id,
              role: 'owner'
            })

          if (roleError) {
            console.error('❌ Error assigning user role:', roleError)
            return NextResponse.json({ error: 'Failed to assign user role' }, { status: 500 })
          }
          console.log('✅ User role assigned successfully')
        } else {
          console.error('❌ User data is null after creation')
          return NextResponse.json({ error: 'User data not found after creation' }, { status: 500 })
        }
      } catch (error) {
        console.error('💥 Exception during organization creation:', error)
        return NextResponse.json({ error: 'Exception during organization creation' }, { status: 500 })
      }
    }

    if (account_type === 'company' && company_name) {
      console.log('🏭 Creating company:', company_name)
      
      try {
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
          console.error('❌ Error creating company:', companyError)
          return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
        }
        console.log('✅ Company created:', company.id)

        // Get user ID from users table
        const { data: userData, error: userDataError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        if (userDataError) {
          console.error('❌ Error getting user data:', userDataError)
          return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 })
        }

        if (userData) {
          console.log('👥 Assigning user role for company. User ID:', userData.id, 'Company ID:', company.id)
          
          // Assign user role to company
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userData.id,
              company_id: company.id,
              role: 'owner'
            })

          if (roleError) {
            console.error('❌ Error assigning user role:', roleError)
            return NextResponse.json({ error: 'Failed to assign user role' }, { status: 500 })
          }
          console.log('✅ User role assigned successfully')
        } else {
          console.error('❌ User data is null after company creation')
          return NextResponse.json({ error: 'User data not found after company creation' }, { status: 500 })
        }
      } catch (error) {
        console.error('💥 Exception during company creation:', error)
        return NextResponse.json({ error: 'Exception during company creation' }, { status: 500 })
      }
    }

    if (account_type === 'individual') {
      console.log('👤 Individual user - creating basic user role')
      
      try {
        // Get user ID from users table
        const { data: userData, error: userDataError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('clerk_user_id', userId)
          .single()

        if (userDataError) {
          console.error('❌ Error getting user data for individual:', userDataError)
          return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 })
        }

        if (userData) {
          console.log('👥 Creating individual user role. User ID:', userData.id)
          
          // Create a basic user role for individual users
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userData.id,
              role: 'individual'
            })

          if (roleError) {
            console.error('❌ Error creating individual user role:', roleError)
            return NextResponse.json({ error: 'Failed to create user role' }, { status: 500 })
          }
          console.log('✅ Individual user role created successfully')
        } else {
          console.error('❌ User data is null for individual user')
          return NextResponse.json({ error: 'User data not found' }, { status: 500 })
        }
      } catch (error) {
        console.error('💥 Exception during individual user role creation:', error)
        return NextResponse.json({ error: 'Exception during user role creation' }, { status: 500 })
      }
    }

    console.log('🎉 Onboarding completed successfully for:', userId)
    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding completed successfully' 
    })

  } catch (error) {
    console.error('💥 Error in onboarding API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 