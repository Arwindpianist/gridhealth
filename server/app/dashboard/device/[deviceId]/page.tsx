import React from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '../../../../lib/supabase'
import { getDeviceHealthData } from '../../../../lib/healthMetrics'
import { generateDeviceReportCSV } from '../../../../lib/reportGenerator'
import HealthMetricsDisplay from '../../../components/HealthMetricsDisplay'

interface DevicePageProps {
  params: {
    deviceId: string
  }
}

export default async function DevicePage({ params }: DevicePageProps) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/')
  }

  const { deviceId } = params

  // Get device information
  const { data: device } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('device_id', deviceId)
    .single()

  if (!device) {
    redirect('/dashboard')
  }

  // Get device health data
  const healthData = await getDeviceHealthData(deviceId)
  if (!healthData) {
    redirect('/dashboard')
  }

  // Get recent health metrics
  const { data: healthMetrics } = await supabaseAdmin
    .from('health_metrics')
    .select('*')
    .eq('device_id', deviceId)
    .order('timestamp', { ascending: false })
    .limit(20)

  // Get recent heartbeats
  const { data: heartbeats } = await supabaseAdmin
    .from('health_metrics')
    .select('*')
    .eq('device_id', deviceId)
    .eq('metric_type', 'heartbeat')
    .order('timestamp', { ascending: false })
    .limit(10)

  // Get organization info
  const { data: license } = await supabaseAdmin
    .from('licenses')
    .select('*, organizations(name)')
    .eq('license_key', device.license_key)
    .single()

  const organizationName = license?.organizations?.name || 'Unknown Organization'

  // Generate CSV report
  const csvReport = await generateDeviceReportCSV(deviceId)

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-white">Device Details</span>
              </nav>
              <h1 className="text-2xl font-bold text-white">{device.device_name || device.hostname || 'Device Details'}</h1>
              <p className="text-dark-300">Detailed information and health monitoring</p>
            </div>
            <div className="flex space-x-4">
              <Link 
                href="/dashboard" 
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Dashboard
              </Link>
              {/* Show admin link if user is admin */}
              <Link 
                href="/admin" 
                className="bg-gridhealth-600 hover:bg-gridhealth-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                👑 Admin Panel
              </Link>
              {csvReport && (
                <a 
                  href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvReport)}`}
                  download={`device-report-${device.device_id}.csv`}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  📊 Download Report
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Device Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Device Information */}
          <div className="lg:col-span-2">
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Device Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Device Name</label>
                  <p className="text-white font-medium">{device.device_name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Hostname</label>
                  <p className="text-white font-medium">{device.hostname || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Operating System</label>
                  <p className="text-white font-medium">{device.os_name || 'Unknown'} {device.os_version || ''}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Device Type</label>
                  <p className="text-white font-medium">{device.device_type || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">MAC Address</label>
                  <p className="text-white font-medium">{device.mac_address || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">IP Address</label>
                  <p className="text-white font-medium">{device.ip_address || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Activation Date</label>
                  <p className="text-white font-medium">
                    {device.activation_date ? new Date(device.activation_date).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Last Seen</label>
                  <p className="text-white font-medium">
                    {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Health Status */}
          <div className="lg:col-span-1">
            <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Health Status</h2>
              
              {/* Overall Health Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Overall Health</span>
                  <span className="text-2xl font-bold text-white">{healthData.health_score.overall}/100</span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${
                      healthData.health_score.overall >= 80 ? 'bg-green-500' :
                      healthData.health_score.overall >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${healthData.health_score.overall}%` }}
                  ></div>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                <label className="text-sm text-gray-400">Status</label>
                <div className="flex items-center mt-1">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    healthData.status === 'online' ? 'bg-green-500' :
                    healthData.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-white font-medium capitalize">{healthData.status}</span>
                </div>
              </div>

              {/* Uptime */}
              <div className="mb-4">
                <label className="text-sm text-gray-400">Uptime</label>
                <p className="text-white font-medium">{healthData.uptime_percentage}%</p>
              </div>

              {/* Organization */}
              <div>
                <label className="text-sm text-gray-400">Organization</label>
                <p className="text-white font-medium">{organizationName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Health Metrics Breakdown */}
        <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Health Metrics Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {Object.entries({
              'Performance': healthData.health_score.performance,
              'Disk': healthData.health_score.disk,
              'Memory': healthData.health_score.memory,
              'Network': healthData.health_score.network,
              'Services': healthData.health_score.services,
              'Security': healthData.health_score.security
            }).map(([category, score]) => (
              <div key={category} className="text-center">
                <div className="text-2xl font-bold text-white mb-1">{score}/100</div>
                <div className="text-sm text-gray-400">{category}</div>
                <div className="w-full bg-dark-700 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${
                      score >= 80 ? 'bg-green-500' :
                      score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed System Information */}
        {healthData.latest_health_scan && (
          <>
            {/* Performance Metrics */}
            {healthData.latest_health_scan.performance_metrics && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Performance Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.performance_metrics.cpu_usage_percent || 0}%
                    </div>
                    <div className="text-sm text-gray-400">CPU Usage</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.performance_metrics.memory_usage_percent || 0}%
                    </div>
                    <div className="text-sm text-gray-400">Memory Usage</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.performance_metrics.process_count || 0}
                    </div>
                    <div className="text-sm text-gray-400">Processes</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.performance_metrics.thread_count || 0}
                    </div>
                    <div className="text-sm text-gray-400">Threads</div>
                  </div>
                </div>
              </div>
            )}

            {/* Disk Health */}
            {healthData.latest_health_scan.disk_health && healthData.latest_health_scan.disk_health.length > 0 && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Disk Health</h2>
                <div className="space-y-4">
                  {healthData.latest_health_scan.disk_health.map((disk: any, index: number) => (
                    <div key={index} className="p-4 bg-dark-700 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">Drive {disk.drive_letter}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          disk.health_status === 'Healthy' ? 'bg-green-600 text-white' :
                          disk.health_status === 'Warning' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {disk.health_status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Free Space:</span>
                          <div className="text-white font-medium">
                            {((disk.free_space_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-400">Free %:</span>
                          <div className="text-white font-medium">{disk.free_space_percent?.toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-400">Total:</span>
                          <div className="text-white font-medium">
                            {((disk.total_size_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
                          </div>
                        </div>
                      </div>
                      <div className="w-full bg-dark-600 rounded-full h-2 mt-2">
                        <div 
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${100 - (disk.free_space_percent || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memory Health */}
            {healthData.latest_health_scan.memory_health && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Memory Health</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.memory_health.memory_usage_percent?.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-gray-400">Usage</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {((healthData.latest_health_scan.memory_health.available_physical_memory_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
                    </div>
                    <div className="text-sm text-gray-400">Available</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {((healthData.latest_health_scan.memory_health.total_physical_memory_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
                    </div>
                    <div className="text-sm text-gray-400">Total</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.memory_health.memory_pressure_level || 'Normal'}
                    </div>
                    <div className="text-sm text-gray-400">Pressure</div>
                  </div>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-3 mt-4">
                  <div 
                    className="h-3 bg-blue-500 rounded-full"
                    style={{ width: `${healthData.latest_health_scan.memory_health.memory_usage_percent || 0}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Network Health */}
            {healthData.latest_health_scan.network_health && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Network Health</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.network_health.active_connections || 0}
                    </div>
                    <div className="text-sm text-gray-400">Active Connections</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.network_health.network_adapter_count || 0}
                    </div>
                    <div className="text-sm text-gray-400">Network Adapters</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.network_health.internet_connectivity ? '✅' : '❌'}
                    </div>
                    <div className="text-sm text-gray-400">Internet</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.network_health.dns_servers?.length || 0}
                    </div>
                    <div className="text-sm text-gray-400">DNS Servers</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {healthData.latest_health_scan.network_health.network_interfaces?.map((ni: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-dark-700 rounded-lg">
                      <div>
                        <span className="text-white font-medium">{ni.name}</span>
                        <div className="text-sm text-gray-400">
                          {ni.ip_addresses?.join(', ') || 'No IP'}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          ni.is_connected ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {ni.is_connected ? 'Connected' : 'Disconnected'}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          {ni.speed_mbps} Mbps
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Health */}
            {healthData.latest_health_scan.service_health && healthData.latest_health_scan.service_health.length > 0 && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Service Health</h2>
                <div className="space-y-2">
                  {healthData.latest_health_scan.service_health.map((service: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-dark-700 rounded-lg">
                      <div>
                        <span className="text-white font-medium">{service.display_name}</span>
                        <div className="text-sm text-gray-400">{service.service_name}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          service.status === 'Running' ? 'bg-green-600 text-white' :
                          service.status === 'Stopped' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                        }`}>
                          {service.status}
                        </span>
                        <div className="text-xs text-gray-400 mt-1">
                          {service.startup_type}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Health */}
            {healthData.latest_health_scan.security_health && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Security Health</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.security_health.uac_enabled ? '✅' : '❌'}
                    </div>
                    <div className="text-sm text-gray-400">UAC Enabled</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.security_health.security_updates_available || 0}
                    </div>
                    <div className="text-sm text-gray-400">Updates Available</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.security_health.antivirus_status || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-400">Antivirus</div>
                  </div>
                </div>
              </div>
            )}

            {/* Agent Information */}
            {healthData.latest_health_scan.agent_info && (
              <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
                <h2 className="text-xl font-semibold text-white mb-4">Agent Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.agent_info.version || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-400">Version</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.agent_info.uptime_seconds || 0}s
                    </div>
                    <div className="text-sm text-gray-400">Uptime</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.agent_info.total_scans_performed || 0}
                    </div>
                    <div className="text-sm text-gray-400">Scans Performed</div>
                  </div>
                  <div className="text-center p-4 bg-dark-700 rounded-lg">
                    <div className="text-2xl font-bold text-white">
                      {healthData.latest_health_scan.agent_info.last_successful_scan ? '✅' : '❌'}
                    </div>
                    <div className="text-sm text-gray-400">Last Scan</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Recent Health Data */}
        {healthMetrics && healthMetrics.length > 0 && (
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Health Data</h2>
            <div className="space-y-3">
              {healthMetrics.slice(0, 10).map((metric) => (
                <div key={metric.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div>
                    <div className="text-sm text-white">
                      {metric.metric_type === 'heartbeat' ? '💓 Heartbeat' : '📊 Health Check'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(metric.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{metric.value || 'N/A'}</div>
                    <div className="text-xs text-gray-400">
                      {metric.metric_type === 'heartbeat' ? 'Status' : 'Health Score'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Heartbeats */}
        {heartbeats && heartbeats.length > 0 && (
          <div className="bg-dark-800 rounded-lg border border-dark-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Heartbeats</h2>
            <div className="space-y-3">
              {heartbeats.slice(0, 10).map((heartbeat) => (
                <div key={heartbeat.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div>
                    <div className="text-sm text-white">💓 Heartbeat</div>
                    <div className="text-xs text-gray-400">
                      {new Date(heartbeat.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">
                      {heartbeat.raw_data?.status || 'online'}
                    </div>
                    <div className="text-xs text-gray-400">Status</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 