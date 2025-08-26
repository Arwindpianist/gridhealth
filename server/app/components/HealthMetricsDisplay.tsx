import React from 'react'

interface HealthMetricsDisplayProps {
  healthData: any
  title?: string
  className?: string
}

export default function HealthMetricsDisplay({ healthData, title = "Health Metrics", className = "" }: HealthMetricsDisplayProps) {
  if (!healthData) return null

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getHealthBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className={`bg-dark-800 rounded-lg border border-dark-700 p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
      
      {/* Overall Health Score */}
      {healthData.value && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Overall Health</span>
            <span className={`text-3xl font-bold ${getHealthColor(healthData.value)}`}>
              {healthData.value}/100
            </span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-4">
            <div 
              className={`h-4 rounded-full ${getHealthBgColor(healthData.value)}`}
              style={{ width: `${healthData.value}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {healthData.performance_metrics && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.performance_metrics.cpu_usage_percent || 0}%
              </div>
              <div className="text-xs text-gray-400">CPU Usage</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.performance_metrics.memory_usage_percent || 0}%
              </div>
              <div className="text-xs text-gray-400">Memory Usage</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.performance_metrics.process_count || 0}
              </div>
              <div className="text-xs text-gray-400">Processes</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.performance_metrics.thread_count || 0}
              </div>
              <div className="text-xs text-gray-400">Threads</div>
            </div>
          </div>
        </div>
      )}

      {/* Disk Health */}
      {healthData.disk_health && healthData.disk_health.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Disk Health</h3>
          <div className="space-y-3">
            {healthData.disk_health.map((disk: any, index: number) => (
              <div key={index} className="p-3 bg-dark-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">Drive {disk.drive_letter}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    disk.health_status === 'Healthy' ? 'bg-green-600 text-white' :
                    disk.health_status === 'Warning' ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {disk.health_status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Free:</span>
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
      {healthData.memory_health && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Memory Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.memory_health.memory_usage_percent?.toFixed(1) || 0}%
              </div>
              <div className="text-xs text-gray-400">Usage</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {((healthData.memory_health.available_physical_memory_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
              </div>
              <div className="text-xs text-gray-400">Available</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {((healthData.memory_health.total_physical_memory_bytes / (1024 * 1024 * 1024))).toFixed(1)} GB
              </div>
              <div className="text-xs text-gray-400">Total</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.memory_health.memory_pressure_level || 'Normal'}
              </div>
              <div className="text-xs text-gray-400">Pressure</div>
            </div>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3">
            <div 
              className="h-3 bg-blue-500 rounded-full"
              style={{ width: `${healthData.memory_health.memory_usage_percent || 0}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Network Health */}
      {healthData.network_health && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Network Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.network_health.active_connections || 0}
              </div>
              <div className="text-xs text-gray-400">Connections</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.network_health.network_adapter_count || 0}
              </div>
              <div className="text-xs text-gray-400">Adapters</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.network_health.internet_connectivity ? '✅' : '❌'}
              </div>
              <div className="text-xs text-gray-400">Internet</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.network_health.dns_servers?.length || 0}
              </div>
              <div className="text-xs text-gray-400">DNS</div>
            </div>
          </div>
          <div className="space-y-2">
            {healthData.network_health.network_interfaces?.slice(0, 3).map((ni: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 bg-dark-700 rounded-lg">
                <div>
                  <span className="text-white font-medium text-sm">{ni.name}</span>
                  <div className="text-xs text-gray-400">
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
      {healthData.service_health && healthData.service_health.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Service Health</h3>
          <div className="space-y-2">
            {healthData.service_health.slice(0, 5).map((service: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-2 bg-dark-700 rounded-lg">
                <div>
                  <span className="text-white font-medium text-sm">{service.display_name}</span>
                  <div className="text-xs text-gray-400">{service.service_name}</div>
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
      {healthData.security_health && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-3">Security Health</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.security_health.uac_enabled ? '✅' : '❌'}
              </div>
              <div className="text-xs text-gray-400">UAC Enabled</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.security_health.security_updates_available || 0}
              </div>
              <div className="text-xs text-gray-400">Updates Available</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.security_health.antivirus_status || 'Unknown'}
              </div>
              <div className="text-xs text-gray-400">Antivirus</div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Information */}
      {healthData.agent_info && (
        <div>
          <h3 className="text-lg font-medium text-white mb-3">Agent Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.agent_info.version || 'Unknown'}
              </div>
              <div className="text-xs text-gray-400">Version</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.agent_info.uptime_seconds || 0}s
              </div>
              <div className="text-xs text-gray-400">Uptime</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.agent_info.total_scans_performed || 0}
              </div>
              <div className="text-xs text-gray-400">Scans</div>
            </div>
            <div className="text-center p-3 bg-dark-700 rounded-lg">
              <div className="text-xl font-bold text-white">
                {healthData.agent_info.last_successful_scan ? '✅' : '❌'}
              </div>
              <div className="text-xs text-gray-400">Last Scan</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
