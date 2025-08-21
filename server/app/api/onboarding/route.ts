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

    // Get user ID for role assignments
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (userDataError) {
      console.error('❌ Error getting user data:', userDataError)
      return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 })
    }

    if (!userData) {
      console.error('❌ User data not found')
      return NextResponse.json({ error: 'User data not found' }, { status: 500 })
    }

    // Create organization/company if needed
    if (account_type === 'organization' && organization_name) {
      console.log('🏢 Processing organization:', organization_name)
      
      try {
        // Check if user already has an organization role
        const { data: existingRole, error: roleCheckError } = await supabaseAdmin
          .from('user_roles')
          .select('organization_id')
          .eq('user_id', userData.id)
          .eq('role', 'owner')
          .not('organization_id', 'is', null)
          .single()

        let orgId: string

        if (existingRole?.organization_id) {
          // Update existing organization
          console.log('🔄 Updating existing organization:', existingRole.organization_id)
          const { error: updateError } = await supabaseAdmin
            .from('organizations')
            .update({
              description: description || null,
              address: address || null,
              contact_email: contact_email || null,
              contact_phone: contact_phone || null
            })
            .eq('id', existingRole.organization_id)

          if (updateError) {
            console.error('❌ Error updating organization:', updateError)
            return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
          }
          orgId = existingRole.organization_id
          console.log('✅ Organization updated:', orgId)
        } else {
          // Create new organization
          console.log('🏢 Creating new organization:', organization_name)
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
          orgId = org.id
          console.log('✅ Organization created:', orgId)
        }

        if (userData) {
          // Check if user already has a role for this organization
          const { data: existingRole, error: roleCheckError } = await supabaseAdmin
            .from('user_roles')
            .select('id')
            .eq('user_id', userData.id)
            .eq('organization_id', orgId)
            .eq('role', 'owner')
            .single()

          if (!existingRole) {
            console.log('👥 Assigning user role for organization. User ID:', userData.id, 'Org ID:', orgId)
            
            // Assign user role to organization
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .insert({
                user_id: userData.id,
                organization_id: orgId,
                role: 'owner'
              })

            if (roleError) {
              console.error('❌ Error assigning user role:', roleError)
              return NextResponse.json({ error: 'Failed to assign user role' }, { status: 500 })
            }
            console.log('✅ User role assigned successfully')
          } else {
            console.log('✅ User already has role for this organization')
          }
        }
      } catch (error) {
        console.error('💥 Exception during organization creation:', error)
        return NextResponse.json({ error: 'Exception during organization creation' }, { status: 500 })
      }
    }

    if (account_type === 'company' && company_name) {
      console.log('🏭 Processing company:', company_name)
      
      try {
        // Check if company already exists for this user
        const { data: existingRole, error: roleCheckError } = await supabaseAdmin
          .from('user_roles')
          .select('company_id')
          .eq('user_id', userData.id)
          .eq('role', 'owner')
          .not('company_id', 'is', null)
          .single()

        let companyId: string

        if (existingRole?.company_id) {
          // Update existing company
          console.log('🔄 Updating existing company:', existingRole.company_id)
          const { error: updateError } = await supabaseAdmin
            .from('companies')
            .update({
              email: contact_email || null,
              phone: contact_phone || null,
              address: address || null
            })
            .eq('id', existingRole.company_id)

          if (updateError) {
            console.error('❌ Error updating company:', updateError)
            return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
          }
          companyId = existingRole.company_id
          console.log('✅ Company updated:', companyId)
        } else {
          // Create new company
          console.log('🏭 Creating new company:', company_name)
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
          companyId = company.id
          console.log('✅ Company created:', companyId)
        }

        if (userData) {
          // Check if user already has a role for this company
          const { data: existingRole, error: roleCheckError } = await supabaseAdmin
            .from('user_roles')
            .select('id')
            .eq('user_id', userData.id)
            .eq('company_id', companyId)
            .eq('role', 'owner')
            .single()

          if (!existingRole) {
            console.log('👥 Assigning user role for company. User ID:', userData.id, 'Company ID:', companyId)
            
            // Assign user role to company
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .insert({
                user_id: userData.id,
                company_id: companyId,
                role: 'owner'
              })

            if (roleError) {
              console.error('❌ Error assigning user role:', roleError)
              return NextResponse.json({ error: 'Failed to assign user role' }, { status: 500 })
            }
            console.log('✅ User role assigned successfully')
          } else {
            console.log('✅ User already has role for this company')
          }
        }
      } catch (error) {
        console.error('💥 Exception during company creation:', error)
        return NextResponse.json({ error: 'Exception during company creation' }, { status: 500 })
      }
    }

    if (account_type === 'individual') {
      console.log('👤 Individual user - processing user role')
      
      try {
        // User data is already available from earlier in the function
        if (userData) {
          // Check if user already has a role
          const { data: existingRole, error: roleCheckError } = await supabaseAdmin
            .from('user_roles')
            .select('id, organization_id')
            .eq('user_id', userData.id)
            .eq('role', 'individual')
            .single()

          if (existingRole) {
            console.log('✅ User already has individual role, updating organization details')
            
            // Update the virtual organization details
            if (existingRole.organization_id) {
              const { error: updateError } = await supabaseAdmin
                .from('organizations')
                .update({
                  name: `Individual Account - ${first_name} ${last_name}`,
                  description: 'Individual user account',
                  contact_email: contact_email || null,
                  contact_phone: contact_phone || null,
                  address: address || null
                })
                .eq('id', existingRole.organization_id)

              if (updateError) {
                console.error('❌ Error updating virtual organization:', updateError)
              } else {
                console.log('✅ Virtual organization updated successfully')
              }
            }
          } else {
            console.log('👥 Creating individual user role. User ID:', userData.id)
            
            // Create a virtual organization for individual users to satisfy the constraint
            const { data: virtualOrg, error: orgError } = await supabaseAdmin
              .from('organizations')
              .insert({
                name: `Individual Account - ${first_name} ${last_name}`,
                description: 'Individual user account',
                contact_email: contact_email || null,
                contact_phone: contact_phone || null,
                address: address || null,
                device_limit: 3
              })
              .select()
              .single()

            if (orgError) {
              console.error('❌ Error creating virtual organization for individual:', orgError)
              return NextResponse.json({ error: 'Failed to create virtual organization' }, { status: 500 })
            }
            console.log('✅ Virtual organization created for individual:', virtualOrg.id)
            
            // Create a basic user role for individual users linked to the virtual organization
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .insert({
                user_id: userData.id,
                organization_id: virtualOrg.id,
                role: 'individual'
              })

            if (roleError) {
              console.error('❌ Error creating individual user role:', roleError)
              return NextResponse.json({ error: 'Failed to create user role' }, { status: 500 })
            }
            console.log('✅ Individual user role created successfully')
          }
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