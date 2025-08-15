import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      organizationToken: string
      deviceId: string
      deviceName: string
      deviceType?: string
    }
    
    // Validate required fields
    if (!body.organizationToken || !body.deviceId || !body.deviceName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: organizationToken, deviceId, deviceName',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }
    
    // Log the enrollment request
    console.log('🔐 Device enrollment request:', {
      organizationToken: body.organizationToken,
      deviceId: body.deviceId,
      deviceName: body.deviceName,
      deviceType: body.deviceType || 'unknown'
    })
    
    // TODO: Validate organization token against Supabase
    // TODO: Check device limits for the organization
    // TODO: Store device information in database
    // TODO: Generate device-specific configuration
    
    // For now, simulate successful enrollment
    const enrollmentResponse = {
      success: true,
      message: 'Device enrolled successfully',
      timestamp: new Date().toISOString(),
      device: {
        id: body.deviceId,
        name: body.deviceName,
        type: body.deviceType || 'unknown',
        status: 'active',
        enrolledAt: new Date().toISOString()
      },
      configuration: {
        scanIntervalMinutes: 5,
        retryAttempts: 3,
        retryDelaySeconds: 30,
        customChecks: ['disk_space', 'memory_usage', 'critical_services']
      }
    }
    
    console.log('✅ Enrollment successful:', enrollmentResponse)
    
    return NextResponse.json(enrollmentResponse)
    
  } catch (error) {
    console.error('❌ Error processing enrollment:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process enrollment request',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Device enrollment endpoint - POST to enroll a device',
    timestamp: new Date().toISOString()
  })
} 