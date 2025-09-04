import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { device_ids } = await request.json()
    
    if (!device_ids || !Array.isArray(device_ids)) {
      return NextResponse.json({ error: 'Invalid device_ids parameter' }, { status: 400 })
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

    // Get user's organization and role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('organization_id, company_id, role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    const organizationId = userRole.organization_id || userRole.company_id
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Fetch the latest health metrics for each device
    const { data: metrics, error: metricsError } = await supabaseAdmin
      .from('health_metrics')
      .select('device_id, timestamp, value, performance_metrics, memory_health, disk_health, network_health')
      .in('device_id', device_ids)
      .order('timestamp', { ascending: false })

    if (metricsError) {
      console.error('Error fetching health metrics:', metricsError)
      return NextResponse.json({ error: 'Failed to fetch health metrics' }, { status: 500 })
    }

    // Process the metrics to extract CPU, Memory, Disk, and Network data
    const processedMetrics = metrics?.map(metric => {
      const performance = metric.performance_metrics || {}
      const memory = metric.memory_health || {}
      const disk = metric.disk_health || []
      const network = metric.network_health || {}

      // Extract CPU usage from performance_metrics
      const cpuUsage = performance.cpu_usage || 
                      performance.cpu_percent || 
                      performance.processor_usage || 0

      // Extract memory usage from memory_health
      const memoryUsage = memory.memory_usage || 
                         memory.ram_usage || 
                         memory.percent_used || 0

      // Extract disk usage from disk_health (take the first disk or average)
      let diskUsage = 0
      if (Array.isArray(disk) && disk.length > 0) {
        const totalDiskUsage = disk.reduce((sum, d) => sum + (d.usage_percent || d.percent_used || 0), 0)
        diskUsage = Math.round(totalDiskUsage / disk.length)
      } else if (typeof disk === 'object') {
        diskUsage = disk.usage_percent || disk.percent_used || 0
      }

      // Extract network status from network_health
      const networkStatus = network.status || 
                           network.connection_status || 
                           (network.is_connected ? 'connected' : 'disconnected') || 'unknown'

      return {
        device_id: metric.device_id,
        timestamp: metric.timestamp,
        health_score: metric.value || 100,
        cpu_usage: Math.round(cpuUsage),
        memory_usage: Math.round(memoryUsage),
        disk_usage: Math.round(diskUsage),
        network_status: networkStatus
      }
    }) || []

    return NextResponse.json({
      success: true,
      metrics: processedMetrics
    })

  } catch (error) {
    console.error('Error in health metrics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
