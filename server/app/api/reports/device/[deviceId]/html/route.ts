import { NextRequest, NextResponse } from 'next/server'
import { generateDeviceReport } from '../../../../../../lib/reportGenerator'
import { getDeviceHealthData } from '../../../../../../lib/healthMetrics'

/**
 * Generate HTML for device report PDF
 */
function generateDeviceReportHTML(report: any, healthData: any): string {
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
        
        .print-instructions {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
          text-align: center;
        }
        
        .print-instructions h4 {
          color: #3B82F6;
          margin-bottom: 8px;
        }
        
        .print-instructions p {
          color: #94A3B8;
          font-size: 14px;
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
          
          .print-instructions {
            display: none;
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
        
        <div class="print-instructions">
          <h4>📄 Save as PDF</h4>
          <p>Press Ctrl+P (or Cmd+P on Mac) and select "Save as PDF" to download this report</p>
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

export async function GET(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  try {
    const { deviceId } = params

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 })
    }

    // Generate report data
    const report = await generateDeviceReport(deviceId)
    if (!report) {
      return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }

    const healthData = await getDeviceHealthData(deviceId)
    if (!healthData) {
      return NextResponse.json({ error: 'Failed to get health data' }, { status: 500 })
    }

    // Generate HTML
    const html = generateDeviceReportHTML(report, healthData)

    // Return HTML as response
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="device-report-${deviceId}.html"`
      }
    })
  } catch (error) {
    console.error('Error generating device HTML report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
