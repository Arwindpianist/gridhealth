import { supabaseAdmin } from './supabase'
import { getDeviceHealthData, getOrganizationHealthSummary } from './healthMetrics'

export interface DeviceReport {
  device_id: string
  device_name: string
  hostname: string
  os_name: string
  os_version: string
  mac_address: string
  ip_address: string
  activation_date: string
  last_seen: string
  status: string
  health_score: number
  uptime_percentage: number
  health_details: {
    performance: number
    disk: number
    memory: number
    network: number
    services: number
    security: number
  }
  recent_health_data: any[]
  recent_heartbeats: any[]
}

export interface OrganizationReport {
  organization_name: string
  subscription_status: string
  device_limit: number
  total_devices: number
  online_devices: number
  offline_devices: number
  average_health_score: number
  device_breakdown: {
    healthy: number
    warning: number
    critical: number
  }
  devices: DeviceReport[]
  licenses: any[]
  generated_at: string
}

/**
 * Generate comprehensive device report
 */
export async function generateDeviceReport(deviceId: string): Promise<DeviceReport | null> {
  try {
    // Get device information
    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('device_id', deviceId)
      .single()

    if (!device) return null

    // Get device health data
    const healthData = await getDeviceHealthData(deviceId)
    if (!healthData) return null

    // Get recent health metrics (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentHealthData } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .eq('device_id', deviceId)
      .neq('metric_type', 'heartbeat')
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(100)

    // Get recent heartbeats (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentHeartbeats } = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .eq('device_id', deviceId)
      .eq('metric_type', 'heartbeat')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(50)

    return {
      device_id: device.device_id,
      device_name: device.device_name || 'Unknown Device',
      hostname: device.hostname || 'Unknown Hostname',
      os_name: device.os_name || 'Unknown OS',
      os_version: device.os_version || 'Unknown Version',
      mac_address: device.mac_address || 'Unknown',
      ip_address: device.ip_address || 'Unknown',
      activation_date: device.activation_date || 'Unknown',
      last_seen: device.last_seen || 'Never',
      status: healthData.status,
      health_score: healthData.health_score.overall,
      uptime_percentage: healthData.uptime_percentage,
      health_details: {
        performance: healthData.health_score.performance,
        disk: healthData.health_score.disk,
        memory: healthData.health_score.memory,
        network: healthData.health_score.network,
        services: healthData.health_score.services,
        security: healthData.health_score.security
      },
      recent_health_data: recentHealthData || [],
      recent_heartbeats: recentHeartbeats || []
    }
  } catch (error) {
    console.error('Error generating device report:', error)
    return null
  }
}

/**
 * Generate comprehensive organization report
 */
export async function generateOrganizationReport(organizationId: string): Promise<OrganizationReport | null> {
  try {
    // Get organization information
    const { data: organization } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (!organization) return null

    // Get organization health summary
    const healthSummary = await getOrganizationHealthSummary(organizationId)
    if (!healthSummary) return null

    // Get all devices for the organization
    const { data: licenses } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    const licenseKeys = licenses?.map(l => l.license_key) || []
    
    const { data: devices } = await supabaseAdmin
      .from('devices')
      .select('*')
      .in('license_key', licenseKeys)

    // Generate device reports
    const deviceReports: DeviceReport[] = []
    for (const device of devices || []) {
      const deviceReport = await generateDeviceReport(device.device_id)
      if (deviceReport) {
        deviceReports.push(deviceReport)
      }
    }

    return {
      organization_name: organization.name,
      subscription_status: organization.subscription_status,
      device_limit: organization.device_limit,
      total_devices: healthSummary.total_devices,
      online_devices: healthSummary.online_devices,
      offline_devices: healthSummary.offline_devices,
      average_health_score: healthSummary.average_health_score,
      device_breakdown: {
        healthy: healthSummary.healthy_devices,
        warning: healthSummary.warning_devices,
        critical: healthSummary.critical_devices
      },
      devices: deviceReports,
      licenses: licenses || [],
      generated_at: new Date().toISOString()
    }
  } catch (error) {
    console.error('Error generating organization report:', error)
    return null
  }
}

/**
 * Convert report to CSV format
 */
export function convertToCSV(data: any[], headers: string[]): string {
  const csvHeaders = headers.join(',')
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header] || ''
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  )
  
  return [csvHeaders, ...csvRows].join('\n')
}

/**
 * Convert report to JSON format
 */
export function convertToJSON(data: any): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Generate device report CSV
 */
export async function generateDeviceReportCSV(deviceId: string): Promise<string | null> {
  const report = await generateDeviceReport(deviceId)
  if (!report) return null

  const headers = [
    'Device ID', 'Device Name', 'Hostname', 'OS Name', 'OS Version',
    'MAC Address', 'IP Address', 'Activation Date', 'Last Seen',
    'Status', 'Health Score', 'Uptime Percentage',
    'Performance Score', 'Disk Score', 'Memory Score',
    'Network Score', 'Services Score', 'Security Score'
  ]

  const data = [{
    'Device ID': report.device_id,
    'Device Name': report.device_name,
    'Hostname': report.hostname,
    'OS Name': report.os_name,
    'OS Version': report.os_version,
    'MAC Address': report.mac_address,
    'IP Address': report.ip_address,
    'Activation Date': report.activation_date,
    'Last Seen': report.last_seen,
    'Status': report.status,
    'Health Score': report.health_score,
    'Uptime Percentage': report.uptime_percentage,
    'Performance Score': report.health_details.performance,
    'Disk Score': report.health_details.disk,
    'Memory Score': report.health_details.memory,
    'Network Score': report.health_details.network,
    'Services Score': report.health_details.services,
    'Security Score': report.health_details.security
  }]

  return convertToCSV(data, headers)
}

/**
 * Generate organization report CSV
 */
export async function generateOrganizationReportCSV(organizationId: string): Promise<string | null> {
  const report = await generateOrganizationReport(organizationId)
  if (!report) return null

  const headers = [
    'Organization Name', 'Subscription Status', 'Device Limit',
    'Total Devices', 'Online Devices', 'Offline Devices',
    'Average Health Score', 'Healthy Devices', 'Warning Devices', 'Critical Devices',
    'Generated At'
  ]

  const data = [{
    'Organization Name': report.organization_name,
    'Subscription Status': report.subscription_status,
    'Device Limit': report.device_limit,
    'Total Devices': report.total_devices,
    'Online Devices': report.online_devices,
    'Offline Devices': report.offline_devices,
    'Average Health Score': report.average_health_score,
    'Healthy Devices': report.device_breakdown.healthy,
    'Warning Devices': report.device_breakdown.warning,
    'Critical Devices': report.device_breakdown.critical,
    'Generated At': report.generated_at
  }]

  return convertToCSV(data, headers)
} 