import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      deviceId: string
      organizationId: string
      timestamp: string
      metrics: Record<string, any>
    }
    
    // Log the received metrics for debugging
    console.log('📊 Received health metrics:', {
      deviceId: body.deviceId,
      organizationId: body.organizationId,
      timestamp: body.timestamp,
      metricsCount: Object.keys(body.metrics || {}).length
    })
    
    // TODO: Store metrics in Supabase database
    // TODO: Implement real-time updates to dashboard
    
    // For now, just acknowledge receipt
    return NextResponse.json({
      success: true,
      message: 'Health metrics received successfully',
      timestamp: new Date().toISOString(),
      receivedData: {
        deviceId: body.deviceId,
        organizationId: body.organizationId,
        metricsCount: Object.keys(body.metrics || {}).length
      }
    })
    
  } catch (error) {
    console.error('❌ Error processing health metrics:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process health metrics',
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Health metrics endpoint - POST to send data',
    timestamp: new Date().toISOString()
  })
} 