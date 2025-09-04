import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../lib/supabase'

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

    // Get user's organization
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, company_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    const organizationId = userRole.organization_id || userRole.company_id

    // If user is admin, get all enquiries, otherwise get only their organization's enquiries
    let query = supabaseAdmin
      .from('license_enquiries')
      .select(`
        *,
        user:users(email, first_name, last_name),
        organization:organizations(name),
        company:companies(name)
      `)
      .order('created_at', { ascending: false })

    if (userRole.role !== 'admin') {
      query = query.eq('organization_id', organizationId)
    }

    const { data: enquiries, error: enquiriesError } = await query

    if (enquiriesError) {
      console.error('Error fetching enquiries:', enquiriesError)
      return NextResponse.json({ error: 'Failed to fetch enquiries' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      enquiries: enquiries || []
    })

  } catch (error) {
    console.error('Error in enquiries API:', error)
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
    const { 
      organization_name, 
      contact_person, 
      email, 
      phone, 
      device_count, 
      use_case, 
      budget_range,
      timeline,
      additional_notes 
    } = body

    if (!organization_name || !contact_person || !email || !device_count) {
      return NextResponse.json({ 
        error: 'Organization name, contact person, email, and device count are required' 
      }, { status: 400 })
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

    // Get user's organization
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, company_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    const organizationId = userRole.organization_id || userRole.company_id

    // Create enquiry
    const { data: enquiry, error: createError } = await supabaseAdmin
      .from('license_enquiries')
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        organization_name,
        contact_person,
        email,
        phone: phone || null,
        device_count: parseInt(device_count),
        use_case: use_case || null,
        budget_range: budget_range || null,
        timeline: timeline || null,
        additional_notes: additional_notes || null,
        status: 'pending',
        created_by: user.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating enquiry:', createError)
      return NextResponse.json({ error: 'Failed to create enquiry' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      enquiry,
      message: 'Enquiry submitted successfully. We will contact you soon!'
    })

  } catch (error) {
    console.error('Error in enquiries API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { enquiry_id, status, admin_notes, license_key, device_limit, price, payment_status } = body

    if (!enquiry_id) {
      return NextResponse.json({ error: 'Enquiry ID is required' }, { status: 400 })
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

    // Only admins can update enquiries
    if (userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get the enquiry
    const { data: enquiry, error: enquiryError } = await supabaseAdmin
      .from('license_enquiries')
      .select('*')
      .eq('id', enquiry_id)
      .single()

    if (enquiryError || !enquiry) {
      return NextResponse.json({ error: 'Enquiry not found' }, { status: 404 })
    }

    // Update enquiry
    const updateData: any = {}
    if (status) updateData.status = status
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes
    if (license_key) updateData.license_key = license_key
    if (device_limit) updateData.device_limit = parseInt(device_limit)
    if (price) updateData.price = parseFloat(price)
    if (payment_status) updateData.payment_status = payment_status
    updateData.updated_at = new Date().toISOString()
    updateData.updated_by = user.id

    const { data: updatedEnquiry, error: updateError } = await supabaseAdmin
      .from('license_enquiries')
      .update(updateData)
      .eq('id', enquiry_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating enquiry:', updateError)
      return NextResponse.json({ error: 'Failed to update enquiry' }, { status: 500 })
    }

    // If status is 'approved' and license_key is provided, create the license
    if (status === 'approved' && license_key && device_limit) {
      const { error: licenseError } = await supabaseAdmin
        .from('licenses')
        .insert({
          license_key,
          organization_id: enquiry.organization_id,
          device_limit: parseInt(device_limit),
          status: 'active',
          price: parseFloat(price) || 0,
          payment_status: payment_status || 'pending',
          created_by: user.id,
          enquiry_id: enquiry_id
        })

      if (licenseError) {
        console.error('Error creating license:', licenseError)
        // Continue anyway as the enquiry was updated
      }
    }

    return NextResponse.json({
      success: true,
      enquiry: updatedEnquiry,
      message: 'Enquiry updated successfully'
    })

  } catch (error) {
    console.error('Error in enquiries API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
