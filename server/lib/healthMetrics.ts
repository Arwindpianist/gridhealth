import { supabaseAdmin } from './supabase'

export interface HealthScore {
  overall: number
  performance: number
  disk: number
  memory: number
  network: number
  services: number
  security: number
  details: {
    performance: any
    disk: any
    memory: any
    network: any
    services: any
    security: any
  }
}

export interface DeviceHealthData {
  device_id: string
  last_heartbeat: any
  last_health_check: any
  latest_health_scan: any
  health_score: HealthScore
  status: 'online' | 'offline' | 'warning'
  uptime_percentage: number
  last_seen: string
}

/**
 * Calculate overall health score from health metrics data
 */
export function calculateHealthScore(healthData: any): HealthScore {
  const defaultScore: HealthScore = {
    overall: 100,
    performance: 100,
    disk: 100,
    memory: 100,
    network: 100,
    services: 100,
    security: 100,
    details: {
      performance: {},
      disk: {},
      memory: {},
      network: {},
      services: {},
      security: {}
    }
  }

  if (!healthData) return defaultScore

  try {
    // Extract metrics from health data
    const performance = healthData.performance_metrics || {}
    const disk = healthData.disk_health || []
    const memory = healthData.memory_health || {}
    const network = healthData.network_health || {}
    const services = healthData.service_health || []
    const security = healthData.security_health || {}

    // Calculate performance score
    let performanceScore = 100
    if (performance.cpu_usage) {
      performanceScore = Math.max(0, 100 - performance.cpu_usage)
    }
    if (performance.memory_usage) {
      performanceScore = Math.min(performanceScore, Math.max(0, 100 - performance.memory_usage))
    }

    // Calculate disk score
    let diskScore = 100
    if (Array.isArray(disk) && disk.length > 0) {
      const diskUsage = disk.reduce((sum: number, d: any) => {
        if (d.usage_percent) {
          return sum + d.usage_percent
        }
        return sum
      }, 0) / disk.length
      diskScore = Math.max(0, 100 - diskUsage)
    }

    // Calculate memory score
    let memoryScore = 100
    if (memory.usage_percent) {
      memoryScore = Math.max(0, 100 - memory.usage_percent)
    }

    // Calculate network score
    let networkScore = 100
    if (network.network_interfaces) {
      const activeInterfaces = network.network_interfaces.filter((ni: any) => ni.is_up)
      if (activeInterfaces.length === 0) {
        networkScore = 0
      } else if (activeInterfaces.length < network.network_interfaces.length) {
        networkScore = 80
      }
    }

    // Calculate services score
    let servicesScore = 100
    if (Array.isArray(services) && services.length > 0) {
      const criticalServices = services.filter((s: any) => s.status === 'critical')
      const warningServices = services.filter((s: any) => s.status === 'warning')
      
      if (criticalServices.length > 0) {
        servicesScore = Math.max(0, 100 - (criticalServices.length * 20))
      } else if (warningServices.length > 0) {
        servicesScore = Math.max(0, 100 - (warningServices.length * 10))
      }
    }

    // Calculate security score
    let securityScore = 100
    if (security.vulnerabilities) {
      const criticalVulns = security.vulnerabilities.filter((v: any) => v.severity === 'critical')
      const highVulns = security.vulnerabilities.filter((v: any) => v.severity === 'high')
      
      if (criticalVulns.length > 0) {
        securityScore = Math.max(0, 100 - (criticalVulns.length * 25))
      } else if (highVulns.length > 0) {
        securityScore = Math.max(0, 100 - (highVulns.length * 15))
      }
    }

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      (performanceScore * 0.25) +
      (diskScore * 0.20) +
      (memoryScore * 0.20) +
      (networkScore * 0.15) +
      (servicesScore * 0.15) +
      (securityScore * 0.05)
    )

    return {
      overall: Math.max(0, Math.min(100, overallScore)),
      performance: Math.max(0, Math.min(100, performanceScore)),
      disk: Math.max(0, Math.min(100, diskScore)),
      memory: Math.max(0, Math.min(100, memoryScore)),
      network: Math.max(0, Math.min(100, networkScore)),
      services: Math.max(0, Math.min(100, servicesScore)),
      security: Math.max(0, Math.min(100, securityScore)),
      details: {
        performance,
        disk,
        memory,
        network,
        services,
        security
      }
    }
  } catch (error) {
    console.error('Error calculating health score:', error)
    return defaultScore
  }
}

/**
 * Get comprehensive health data for a specific device
 */
export async function getDeviceHealthData(deviceId: string): Promise<DeviceHealthData | null> {
  try {
    // Get device information
    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('device_id', deviceId)
      .single()

    if (!device) return null

    // Get recent health metrics
    const { data: healthMetrics } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .eq('device_id', deviceId)
      .order('timestamp', { ascending: false })
      .limit(50)

    // Get recent heartbeats
    const { data: heartbeats } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .eq('device_id', deviceId)
      .eq('metric_type', 'heartbeat')
      .order('timestamp', { ascending: false })
      .limit(10)

    // Get recent health checks (non-heartbeat)
    const { data: healthChecks } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .eq('device_id', deviceId)
      .neq('metric_type', 'heartbeat')
      .order('timestamp', { ascending: false })
      .limit(10)

    // Get the latest comprehensive health scan data
    const { data: latestHealthScan } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .eq('device_id', deviceId)
      .eq('metric_type', 'health_scan')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()

    // Calculate device status
    let status: 'online' | 'offline' | 'warning' = 'offline'
    let uptimePercentage = 0

    if (device.last_seen) {
      const lastSeen = new Date(device.last_seen)
      const now = new Date()
      const minutesSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60)
      
      if (minutesSinceLastSeen <= 5) {
        status = 'online'
        uptimePercentage = 100
      } else if (minutesSinceLastSeen <= 30) {
        status = 'warning'
        uptimePercentage = 80
      } else {
        status = 'offline'
        uptimePercentage = 0
      }
    }

    // Calculate health score from latest comprehensive health scan
    let healthScore: HealthScore
    
    if (latestHealthScan) {
      // Use the comprehensive health scan data directly
      healthScore = {
        overall: latestHealthScan.value || 100,
        performance: latestHealthScan.performance_metrics?.cpu_usage_percent ? 
          Math.max(0, 100 - (latestHealthScan.performance_metrics.cpu_usage_percent + latestHealthScan.performance_metrics.memory_usage_percent) / 2) : 100,
        disk: latestHealthScan.disk_health?.[0]?.free_space_percent ? 
          Math.max(0, Math.min(100, latestHealthScan.disk_health[0].free_space_percent)) : 100,
        memory: latestHealthScan.memory_health?.memory_usage_percent ? 
          Math.max(0, 100 - latestHealthScan.memory_health.memory_usage_percent) : 100,
        network: latestHealthScan.network_health?.internet_connectivity ? 100 : 80,
        services: latestHealthScan.service_health?.filter((s: any) => s.status === 'Running').length === latestHealthScan.service_health?.length ? 100 : 80,
        security: latestHealthScan.security_health?.uac_enabled ? 100 : 80,
        details: {
          performance: latestHealthScan.performance_metrics || {},
          disk: latestHealthScan.disk_health || [],
          memory: latestHealthScan.memory_health || {},
          network: latestHealthScan.network_health || {},
          services: latestHealthScan.service_health || [],
          security: latestHealthScan.security_health || {}
        }
      }
    } else {
      // Fallback to calculated score from health checks
      const latestHealthCheck = healthChecks?.[0]
      healthScore = latestHealthCheck ? calculateHealthScore(latestHealthCheck) : {
        overall: 100,
        performance: 100,
        disk: 100,
        memory: 100,
        network: 100,
        services: 100,
        security: 100,
        details: {
          performance: {},
          disk: {},
          memory: {},
          network: {},
          services: {},
          security: {}
        }
      }
    }

    return {
      device_id: deviceId,
      last_heartbeat: heartbeats?.[0],
      last_health_check: healthChecks?.[0],
      latest_health_scan: latestHealthScan,
      health_score: healthScore,
      status,
      uptime_percentage: uptimePercentage,
      last_seen: device.last_seen
    }
  } catch (error) {
    console.error('Error getting device health data:', error)
    return null
  }
}

/**
 * Get organization health summary
 */
export async function getOrganizationHealthSummary(organizationId: string) {
  try {
    // Get all devices for the organization
    const { data: devices } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('license_key', (await supabaseAdmin
        .from('licenses')
        .select('license_key')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single())?.data?.license_key || '')

    if (!devices || devices.length === 0) {
      return {
        total_devices: 0,
        online_devices: 0,
        offline_devices: 0,
        average_health_score: 0,
        critical_devices: 0,
        warning_devices: 0,
        healthy_devices: 0
      }
    }

    // Calculate health summary
    let onlineDevices = 0
    let offlineDevices = 0
    let totalHealthScore = 0
    let criticalDevices = 0
    let warningDevices = 0
    let healthyDevices = 0

    for (const device of devices) {
      const healthData = await getDeviceHealthData(device.device_id)
      if (healthData) {
        if (healthData.status === 'online') onlineDevices++
        else offlineDevices++

        totalHealthScore += healthData.health_score.overall

        if (healthData.health_score.overall >= 80) {
          healthyDevices++
        } else if (healthData.health_score.overall >= 60) {
          warningDevices++
        } else {
          criticalDevices++
        }
      }
    }

    return {
      total_devices: devices.length,
      online_devices: onlineDevices,
      offline_devices: offlineDevices,
      average_health_score: Math.round(totalHealthScore / devices.length),
      critical_devices: criticalDevices,
      warning_devices: warningDevices,
      healthy_devices: healthyDevices
    }
  } catch (error) {
    console.error('Error getting organization health summary:', error)
    return null
  }
} 