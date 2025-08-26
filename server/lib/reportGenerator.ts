import { supabaseAdmin } from './supabase'
import { getDeviceHealthData, getOrganizationHealthSummary } from './healthMetrics'

export interface DeviceReport {
  device_id: string
  device_name: string
  hostname: string
  os_name: string
  os_version: string
  device_type?: string
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
      device_type: device.device_type || 'Unknown',
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
 * Generate HTML for device report PDF
 */
function generateDeviceReportHTML(report: DeviceReport, healthData: any): string {
  const formatDate = (dateString: string) => {
    if (dateString === 'Unknown' || dateString === 'Never') return dateString
    return new Date(dateString).toLocaleString()
  }

  const getHealthColor = (score: number) => {
    if (score >= 80) return '#10B981' // green
    if (score >= 60) return '#F59E0B' // yellow
    return '#EF4444' // red
  }

  const getHealthStatus = (score: number) => {
    if (score >= 80) return 'Healthy'
    if (score >= 60) return 'Warning'
    return 'Critical'
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Device Health Report - ${report.device_name}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
          color: #F8FAFC;
          line-height: 1.6;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding: 30px;
          background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
          border-radius: 16px;
          border: 1px solid #475569;
        }
        
        .logo {
          font-size: 32px;
          font-weight: bold;
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 10px;
        }
        
        .subtitle {
          color: #94A3B8;
          font-size: 18px;
        }
        
        .device-title {
          font-size: 28px;
          font-weight: bold;
          margin: 20px 0;
          color: #F8FAFC;
        }
        
        .grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .card {
          background: linear-gradient(135deg, #1E293B 0%, #334155 100%);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid #475569;
        }
        
        .card h3 {
          font-size: 20px;
          margin-bottom: 20px;
          color: #F8FAFC;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        .info-item {
          padding: 16px;
          background: rgba(71, 85, 105, 0.3);
          border-radius: 8px;
          border: 1px solid rgba(71, 85, 105, 0.3);
        }
        
        .info-label {
          font-size: 12px;
          color: #94A3B8;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #F8FAFC;
        }
        
        .health-score {
          text-align: center;
          padding: 20px;
        }
        
        .score-display {
          font-size: 48px;
          font-weight: bold;
          margin: 16px 0;
        }
        
        .progress-bar {
          width: 100%;
          height: 16px;
          background: #475569;
          border-radius: 8px;
          overflow: hidden;
          margin: 16px 0;
        }
        
        .progress-fill {
          height: 100%;
          border-radius: 8px;
          transition: width 0.5s ease;
        }
        
        .status-indicator {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .metric-card {
          text-align: center;
          padding: 20px;
          background: rgba(71, 85, 105, 0.3);
          border-radius: 12px;
          border: 1px solid rgba(71, 85, 105, 0.3);
        }
        
        .metric-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }
        
        .metric-score {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .metric-label {
          font-size: 14px;
          color: #94A3B8;
          font-weight: 500;
        }
        
        .section {
          margin-bottom: 30px;
        }
        
        .section h3 {
          font-size: 20px;
          margin-bottom: 20px;
          color: #F8FAFC;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .disk-item {
          padding: 16px;
          background: rgba(71, 85, 105, 0.3);
          border-radius: 12px;
          border: 1px solid rgba(71, 85, 105, 0.3);
          margin-bottom: 16px;
        }
        
        .disk-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .disk-name {
          font-size: 18px;
          font-weight: 600;
          color: #F8FAFC;
        }
        
        .disk-status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid;
        }
        
        .disk-status.healthy {
          background: rgba(16, 185, 129, 0.2);
          color: #10B981;
          border-color: rgba(16, 185, 129, 0.3);
        }
        
        .disk-info {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .disk-progress {
          width: 100%;
          height: 8px;
          background: #475569;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .footer {
          text-align: center;
          margin-top: 40px;
          padding: 20px;
          color: #94A3B8;
          font-size: 14px;
          border-top: 1px solid #475569;
        }
        
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          
          .card {
            background: white !important;
            border: 1px solid #ddd !important;
            color: black !important;
          }
          
          .info-item, .metric-card, .disk-item {
            background: #f8f9fa !important;
            border: 1px solid #ddd !important;
            color: black !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🔄 GridHealth</div>
          <div class="subtitle">Device Health Report</div>
          <div class="device-title">${report.device_name || report.hostname}</div>
          <div style="color: #94A3B8; font-size: 14px;">
            Generated on ${new Date().toLocaleString()}
          </div>
        </div>
        
        <div class="grid">
          <div class="card">
            <h3>📱 Device Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Device Name</div>
                <div class="info-value">${report.device_name || 'Unknown'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Hostname</div>
                <div class="info-value">${report.hostname || 'Unknown'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Operating System</div>
                <div class="info-value">${report.os_name || 'Unknown'} ${report.os_version || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Device Type</div>
                <div class="info-value">${report.device_type || 'Unknown'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">MAC Address</div>
                <div class="info-value" style="font-family: monospace; font-size: 14px;">${report.mac_address || 'Unknown'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">IP Address</div>
                <div class="info-value" style="font-family: monospace; font-size: 14px;">${report.ip_address || 'Unknown'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Activation Date</div>
                <div class="info-value">${formatDate(report.activation_date)}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Last Seen</div>
                <div class="info-value">${formatDate(report.last_seen)}</div>
              </div>
            </div>
          </div>
          
          <div class="card">
            <h3>💚 Health Status</h3>
            <div class="health-score">
              <div class="info-label">Overall Health</div>
              <div class="score-display" style="color: ${getHealthColor(report.health_score)};">
                ${report.health_score}/100
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${report.health_score}%; background: ${getHealthColor(report.health_score)};"></div>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <div class="status-indicator" style="background: ${getHealthColor(report.health_score)};"></div>
                <span style="color: #94A3B8; font-size: 14px;">
                  ${getHealthStatus(report.health_score)}
                </span>
              </div>
            </div>
            
            <div style="margin-top: 20px;">
              <div class="info-label">Status</div>
              <div style="display: flex; align-items: center; padding: 12px; background: rgba(71, 85, 105, 0.3); border-radius: 8px; border: 1px solid rgba(71, 85, 105, 0.3);">
                <div class="status-indicator" style="background: ${report.status === 'online' ? '#10B981' : report.status === 'warning' ? '#F59E0B' : '#EF4444'};"></div>
                <span style="font-weight: 600; text-transform: capitalize;">${report.status}</span>
              </div>
            </div>
            
            <div style="margin-top: 16px;">
              <div class="info-label">Uptime</div>
              <div style="font-weight: 600; font-size: 18px;">${report.uptime_percentage}%</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3>📊 Health Metrics Breakdown</h3>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon">⚡</div>
              <div class="metric-score" style="color: ${getHealthColor(report.health_details.performance)};">
                ${report.health_details.performance}/100
              </div>
              <div class="metric-label">Performance</div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">💾</div>
              <div class="metric-score" style="color: ${getHealthColor(report.health_details.disk)};">
                ${report.health_details.disk}/100
              </div>
              <div class="metric-label">Disk</div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">🧠</div>
              <div class="metric-score" style="color: ${getHealthColor(report.health_details.memory)};">
                ${report.health_details.memory}/100
              </div>
              <div class="metric-label">Memory</div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">🌐</div>
              <div class="metric-score" style="color: ${getHealthColor(report.health_details.network)};">
                ${report.health_details.network}/100
              </div>
              <div class="metric-label">Network</div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">🔧</div>
              <div class="metric-score" style="color: ${getHealthColor(report.health_details.services)};">
                ${report.health_details.services}/100
              </div>
              <div class="metric-label">Services</div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">🛡️</div>
              <div class="metric-score" style="color: ${getHealthColor(report.health_details.security)};">
                ${report.health_details.security}/100
              </div>
              <div class="metric-label">Security</div>
            </div>
          </div>
        </div>
        
        ${healthData.latest_health_scan?.disk_health ? `
        <div class="section">
          <h3>💾 Disk Health</h3>
          ${healthData.latest_health_scan.disk_health.map((disk: any) => `
            <div class="disk-item">
              <div class="disk-header">
                <span class="disk-name">Drive ${disk.drive_letter}</span>
                <span class="disk-status ${disk.health_status?.toLowerCase() === 'healthy' ? 'healthy' : ''}">
                  ${disk.health_status || 'Unknown'}
                </span>
              </div>
              <div class="disk-info">
                <div>
                  <div class="info-label">Free Space</div>
                  <div class="info-value">${((disk.free_space_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB</div>
                </div>
                <div>
                  <div class="info-label">Free %</div>
                  <div class="info-value">${disk.free_space_percent?.toFixed(1)}%</div>
                </div>
                <div>
                  <div class="info-label">Total</div>
                  <div class="info-value">${((disk.total_size_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB</div>
                </div>
              </div>
              <div class="disk-progress">
                <div style="width: ${100 - (disk.free_space_percent || 0)}%; height: 100%; background: #3B82F6; border-radius: 4px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${healthData.latest_health_scan?.performance_metrics ? `
        <div class="section">
          <h3>⚡ Performance Metrics</h3>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon">🖥️</div>
              <div class="metric-score">${healthData.latest_health_scan.performance_metrics.cpu_usage_percent || 0}%</div>
              <div class="metric-label">CPU Usage</div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">💾</div>
              <div class="metric-score">${healthData.latest_health_scan.performance_metrics.memory_usage_percent || 0}%</div>
              <div class="metric-label">Memory Usage</div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">📁</div>
              <div class="metric-score">${healthData.latest_health_scan.performance_metrics.process_count || 0}</div>
              <div class="metric-label">Processes</div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">🧵</div>
              <div class="metric-score">${healthData.latest_health_scan.performance_metrics.thread_count || 0}</div>
              <div class="metric-label">Threads</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>This report was generated automatically by GridHealth monitoring system.</p>
          <p>For questions or support, please contact your system administrator.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

import puppeteer from 'puppeteer'

/**
 * Generate device report PDF
 */
export async function generateDeviceReportPDF(deviceId: string): Promise<Uint8Array | null> {
  try {
    const report = await generateDeviceReport(deviceId)
    if (!report) return null

    const healthData = await getDeviceHealthData(deviceId)
    if (!healthData) return null

    const html = generateDeviceReportHTML(report, healthData)
    
    // Launch browser and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    // Generate PDF with proper settings
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    })
    
    await browser.close()
    return pdf
  } catch (error) {
    console.error('Error generating device report PDF:', error)
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