import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // This endpoint requires admin authentication
    // You can add your own authentication logic here
    
    const body = await request.json()
    const { max_heartbeats_per_device = 5 } = body

    console.log('🧹 Starting heartbeat cleanup process...')
    console.log(`📊 Target: Keep ${max_heartbeats_per_device} heartbeats per device`)

    let totalDeleted = 0
    let devicesProcessed = 0

    // Get all devices that have heartbeat records
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from('health_metrics')
      .select('device_id')
      .eq('metric_type', 'heartbeat')
      .order('device_id')

    if (devicesError) {
      console.error('❌ Error fetching devices:', devicesError)
      return NextResponse.json(
        { error: 'Failed to fetch devices' },
        { status: 500 }
      )
    }

    // Get unique device IDs
    const uniqueDeviceIds = [...new Set(devices.map(d => d.device_id))]
    console.log(`🔍 Found ${uniqueDeviceIds.length} devices with heartbeat records`)

    // Process each device
    for (const deviceId of uniqueDeviceIds) {
      try {
        // Get count of heartbeats for this device
        const { data: heartbeatCount, error: countError } = await supabaseAdmin
          .from('health_metrics')
          .select('id', { count: 'exact' })
          .eq('device_id', deviceId)
          .eq('metric_type', 'heartbeat')

        if (countError) {
          console.error(`❌ Error counting heartbeats for device ${deviceId}:`, countError)
          continue
        }

        const currentCount = heartbeatCount?.length || 0

        if (currentCount > max_heartbeats_per_device) {
          const heartbeatsToDelete = currentCount - max_heartbeats_per_device
          
          // Get the oldest heartbeat records to delete
          const { data: oldHeartbeats, error: selectError } = await supabaseAdmin
            .from('health_metrics')
            .select('id')
            .eq('device_id', deviceId)
            .eq('metric_type', 'heartbeat')
            .order('timestamp', { ascending: true })
            .limit(heartbeatsToDelete)

          if (selectError) {
            console.error(`❌ Error selecting old heartbeats for device ${deviceId}:`, selectError)
            continue
          }

          if (oldHeartbeats && oldHeartbeats.length > 0) {
            const idsToDelete = oldHeartbeats.map(h => h.id)
            
            const { error: deleteError } = await supabaseAdmin
              .from('health_metrics')
              .delete()
              .in('id', idsToDelete)

            if (deleteError) {
              console.error(`❌ Error deleting old heartbeats for device ${deviceId}:`, deleteError)
            } else {
              totalDeleted += idsToDelete.length
              console.log(`🗑️ Device ${deviceId}: Deleted ${idsToDelete.length} old heartbeats (keeping ${max_heartbeats_per_device} latest)`)
            }
          }
        } else {
          console.log(`✅ Device ${deviceId}: Already within limit (${currentCount}/${max_heartbeats_per_device})`)
        }

        devicesProcessed++
      } catch (error) {
        console.error(`❌ Error processing device ${deviceId}:`, error)
      }
    }

    console.log(`🎉 Heartbeat cleanup completed!`)
    console.log(`📊 Devices processed: ${devicesProcessed}`)
    console.log(`🗑️ Total records deleted: ${totalDeleted}`)

    return NextResponse.json({
      success: true,
      message: 'Heartbeat cleanup completed successfully',
      summary: {
        devices_processed: devicesProcessed,
        total_deleted: totalDeleted,
        max_heartbeats_per_device: max_heartbeats_per_device,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Heartbeat cleanup error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 