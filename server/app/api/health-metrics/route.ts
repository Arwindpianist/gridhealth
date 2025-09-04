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

    // Get device information
    const { data: devices, error: devicesError } = await supabaseAdmin
      .from('devices')
      .select('device_id, last_seen, health_status')
      .in('device_id', device_ids)

    if (devicesError) {
      console.error('Error fetching devices:', devicesError)
      return NextResponse.json({ error: 'Failed to fetch device information' }, { status: 500 })
    }

    // Process each device to get real health metrics
    const processedMetrics = await Promise.all((devices || []).map(async (device) => {
      console.log(`Processing device ${device.device_id}: last_seen=${device.last_seen}`)

      // Determine if device is online
      const isOnline = device.last_seen ? (() => {
        const lastSeen = new Date(device.last_seen)
        const now = new Date()
        const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
        return minutesSinceLastSeen <= 5
      })() : false

      // Get the latest comprehensive health scan for this device
      const { data: latestHealthScan } = await supabaseAdmin
        .from('health_metrics')
        .select('*')
        .eq('device_id', device.device_id)
        .eq('metric_type', 'health_scan')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      // Get the latest performance metrics
      const { data: latestPerformance } = await supabaseAdmin
        .from('health_metrics')
        .select('*')
        .eq('device_id', device.device_id)
        .eq('metric_type', 'performance')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      // Get the latest disk health
      const { data: latestDisk } = await supabaseAdmin
        .from('health_metrics')
        .select('*')
        .eq('device_id', device.device_id)
        .eq('metric_type', 'disk_health')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      // Get the latest memory health
      const { data: latestMemory } = await supabaseAdmin
        .from('health_metrics')
        .select('*')
        .eq('device_id', device.device_id)
        .eq('metric_type', 'memory_health')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      // Get the latest network health
      const { data: latestNetwork } = await supabaseAdmin
        .from('health_metrics')
        .select('*')
        .eq('device_id', device.device_id)
        .eq('metric_type', 'network_health')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      // Get the latest service health
      const { data: latestServices } = await supabaseAdmin
        .from('health_metrics')
        .select('*')
        .eq('device_id', device.device_id)
        .eq('metric_type', 'service_health')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      // Get the latest security health
      const { data: latestSecurity } = await supabaseAdmin
        .from('health_metrics')
        .select('*')
        .eq('device_id', device.device_id)
        .eq('metric_type', 'security_health')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      // Extract real metrics from the latest health scan
      const performanceMetrics = latestHealthScan?.performance_metrics || latestPerformance?.performance_metrics || {}
      const diskHealth = latestHealthScan?.disk_health || latestDisk?.disk_health || []
      const memoryHealth = latestHealthScan?.memory_health || latestMemory?.memory_health || {}
      const networkHealth = latestHealthScan?.network_health || latestNetwork?.network_health || {}
      const serviceHealth = latestHealthScan?.service_health || latestServices?.service_health || []
      const securityHealth = latestHealthScan?.security_health || latestSecurity?.security_health || {}

      // Calculate real metrics from actual data
      const cpuUsage = performanceMetrics?.cpu_usage_percent || 0
      const memoryUsage = performanceMetrics?.memory_usage_percent || memoryHealth?.memory_usage_percent || 0
      const diskUsage = diskHealth?.length > 0 ? 
        Math.max(...diskHealth.map((disk: any) => disk.usage_percent || 0)) : 0
      const networkStatus = networkHealth?.internet_connectivity ? 'connected' : 'disconnected'

      // Calculate individual health scores based on real data
      let performanceScore = 100
      let diskScore = 100
      let memoryScore = 100
      let networkScore = 100
      let servicesScore = 100
      let securityScore = 100

      if (isOnline && latestHealthScan) {
        // Calculate performance score based on CPU and memory usage
        const avgUsage = (cpuUsage + memoryUsage) / 2
        performanceScore = Math.max(0, 100 - Math.floor(avgUsage))

        // Calculate memory score
        memoryScore = Math.max(0, 100 - Math.floor(memoryUsage))

        // Calculate disk score based on worst disk usage
        if (diskHealth?.length > 0) {
          const worstDiskUsage = Math.max(...diskHealth.map((disk: any) => disk.usage_percent || 0))
          diskScore = Math.max(0, 100 - Math.floor(worstDiskUsage))
        }

        // Calculate network score
        networkScore = networkHealth?.internet_connectivity ? 100 : 0

        // Calculate services score based on running services
        if (serviceHealth?.length > 0) {
          const runningServices = serviceHealth.filter((service: any) => service.status === 'Running').length
          const totalServices = serviceHealth.length
          servicesScore = totalServices > 0 ? Math.floor((runningServices / totalServices) * 100) : 100
        }

        // Calculate security score based on security health
        if (securityHealth) {
          let securityPoints = 100
          if (!securityHealth.uac_enabled) securityPoints -= 20
          if (securityHealth.security_updates_available > 10) securityPoints -= 15
          if (securityHealth.windows_defender_status === 'Disabled') securityPoints -= 30
          if (securityHealth.firewall_status === 'Disabled') securityPoints -= 25
          securityScore = Math.max(0, securityPoints)
        }
      } else {
        // Offline device - lower scores
        performanceScore = 30
        memoryScore = 30
        diskScore = 30
        networkScore = 0
        servicesScore = 30
        securityScore = 30
      }

      // Calculate overall health score as weighted average
      const overallHealthScore = Math.floor(
        (performanceScore * 0.25) +
        (diskScore * 0.20) +
        (memoryScore * 0.20) +
        (networkScore * 0.15) +
        (servicesScore * 0.15) +
        (securityScore * 0.05)
      )

      const result = {
        device_id: device.device_id,
        timestamp: device.last_seen || new Date().toISOString(),
        health_score: overallHealthScore,
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        disk_usage: diskUsage,
        network_status: networkStatus,
        // Individual health scores
        performance_score: performanceScore,
        disk_score: diskScore,
        memory_score: memoryScore,
        network_score: networkScore,
        services_score: servicesScore,
        security_score: securityScore,
        // Additional real data
        performance_metrics: performanceMetrics,
        disk_health: diskHealth,
        memory_health: memoryHealth,
        network_health: networkHealth,
        service_health: serviceHealth,
        security_health: securityHealth
      }
      
      console.log(`Device ${device.device_id} real metrics:`, {
        health_score: overallHealthScore,
        performance_score: performanceScore,
        disk_score: diskScore,
        memory_score: memoryScore,
        network_score: networkScore,
        services_score: servicesScore,
        security_score: securityScore,
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        disk_usage: diskUsage,
        network_status: networkStatus
      })
      
      return result
    }))

    return NextResponse.json({
      success: true,
      metrics: processedMetrics
    })

  } catch (error) {
    console.error('Error in health metrics API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
