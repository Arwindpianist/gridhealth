using System.Text.Json.Serialization;

namespace GridHealth.Agent.Models;

public class HealthData
{
    [JsonPropertyName("device_id")]
    public string DeviceId { get; set; } = string.Empty;

    [JsonPropertyName("license_key")]
    public string LicenseKey { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("system_info")]
    public SystemInfo SystemInfo { get; set; } = new();

    [JsonPropertyName("performance_metrics")]
    public PerformanceMetrics PerformanceMetrics { get; set; } = new();

    [JsonPropertyName("disk_health")]
    public List<DiskHealth> DiskHealth { get; set; } = new();

    [JsonPropertyName("memory_health")]
    public MemoryHealth MemoryHealth { get; set; } = new();

    [JsonPropertyName("network_health")]
    public NetworkHealth NetworkHealth { get; set; } = new();

    [JsonPropertyName("service_health")]
    public List<ServiceHealth> ServiceHealth { get; set; } = new();

    [JsonPropertyName("security_health")]
    public SecurityHealth SecurityHealth { get; set; } = new();

    [JsonPropertyName("agent_info")]
    public AgentInfo AgentInfo { get; set; } = new();
}

public class SystemInfo
{
    [JsonPropertyName("hostname")]
    public string Hostname { get; set; } = string.Empty;

    [JsonPropertyName("os_name")]
    public string OsName { get; set; } = string.Empty;

    [JsonPropertyName("os_version")]
    public string OsVersion { get; set; } = string.Empty;

    [JsonPropertyName("os_architecture")]
    public string OsArchitecture { get; set; } = string.Empty;

    [JsonPropertyName("machine_name")]
    public string MachineName { get; set; } = string.Empty;

    [JsonPropertyName("processor_count")]
    public int ProcessorCount { get; set; }

    [JsonPropertyName("processor_name")]
    public string ProcessorName { get; set; } = string.Empty;

    [JsonPropertyName("total_physical_memory")]
    public long TotalPhysicalMemory { get; set; }

    [JsonPropertyName("domain")]
    public string Domain { get; set; } = string.Empty;

    [JsonPropertyName("workgroup")]
    public string Workgroup { get; set; } = string.Empty;

    [JsonPropertyName("last_boot_time")]
    public DateTime LastBootTime { get; set; }

    [JsonPropertyName("timezone")]
    public string Timezone { get; set; } = string.Empty;
}

public class PerformanceMetrics
{
    [JsonPropertyName("cpu_usage_percent")]
    public double CpuUsagePercent { get; set; }

    [JsonPropertyName("memory_usage_percent")]
    public double MemoryUsagePercent { get; set; }

    [JsonPropertyName("disk_io_read_bytes_per_sec")]
    public double DiskIoReadBytesPerSec { get; set; }

    [JsonPropertyName("disk_io_write_bytes_per_sec")]
    public double DiskIoWriteBytesPerSec { get; set; }

    [JsonPropertyName("network_bytes_received_per_sec")]
    public double NetworkBytesReceivedPerSec { get; set; }

    [JsonPropertyName("network_bytes_sent_per_sec")]
    public double NetworkBytesSentPerSec { get; set; }

    [JsonPropertyName("process_count")]
    public int ProcessCount { get; set; }

    [JsonPropertyName("thread_count")]
    public int ThreadCount { get; set; }

    [JsonPropertyName("handle_count")]
    public int HandleCount { get; set; }
}

public class DiskHealth
{
    [JsonPropertyName("drive_letter")]
    public string DriveLetter { get; set; } = string.Empty;

    [JsonPropertyName("volume_name")]
    public string VolumeName { get; set; } = string.Empty;

    [JsonPropertyName("file_system")]
    public string FileSystem { get; set; } = string.Empty;

    [JsonPropertyName("total_size_bytes")]
    public long TotalSizeBytes { get; set; }

    [JsonPropertyName("free_space_bytes")]
    public long FreeSpaceBytes { get; set; }

    [JsonPropertyName("used_space_bytes")]
    public long UsedSpaceBytes { get; set; }

    [JsonPropertyName("free_space_percent")]
    public double FreeSpacePercent { get; set; }

    [JsonPropertyName("is_system_drive")]
    public bool IsSystemDrive { get; set; }

    [JsonPropertyName("health_status")]
    public string HealthStatus { get; set; } = "Unknown";

    [JsonPropertyName("smart_status")]
    public string SmartStatus { get; set; } = "Unknown";
}

public class MemoryHealth
{
    [JsonPropertyName("total_physical_memory_bytes")]
    public long TotalPhysicalMemoryBytes { get; set; }

    [JsonPropertyName("available_physical_memory_bytes")]
    public long AvailablePhysicalMemoryBytes { get; set; }

    [JsonPropertyName("used_physical_memory_bytes")]
    public long UsedPhysicalMemoryBytes { get; set; }

    [JsonPropertyName("memory_usage_percent")]
    public double MemoryUsagePercent { get; set; }

    [JsonPropertyName("total_virtual_memory_bytes")]
    public long TotalVirtualMemoryBytes { get; set; }

    [JsonPropertyName("available_virtual_memory_bytes")]
    public long AvailableVirtualMemoryBytes { get; set; }

    [JsonPropertyName("page_file_size_bytes")]
    public long PageFileSizeBytes { get; set; }

    [JsonPropertyName("memory_pressure_level")]
    public string MemoryPressureLevel { get; set; } = "Normal";
}

public class NetworkHealth
{
    [JsonPropertyName("active_connections")]
    public int ActiveConnections { get; set; }

    [JsonPropertyName("network_interfaces")]
    public List<NetworkInterfaceInfo> NetworkInterfaces { get; set; } = new();

    [JsonPropertyName("dns_servers")]
    public List<string> DnsServers { get; set; } = new();

    [JsonPropertyName("default_gateway")]
    public string DefaultGateway { get; set; } = string.Empty;

    [JsonPropertyName("internet_connectivity")]
    public bool InternetConnectivity { get; set; }

    [JsonPropertyName("network_adapter_count")]
    public int NetworkAdapterCount { get; set; }
}

public class NetworkInterfaceInfo
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("ip_addresses")]
    public List<string> IpAddresses { get; set; } = new();

    [JsonPropertyName("mac_address")]
    public string MacAddress { get; set; } = string.Empty;

    [JsonPropertyName("is_enabled")]
    public bool IsEnabled { get; set; }

    [JsonPropertyName("is_connected")]
    public bool IsConnected { get; set; }

    [JsonPropertyName("speed_mbps")]
    public long SpeedMbps { get; set; }
}

public class ServiceHealth
{
    [JsonPropertyName("service_name")]
    public string ServiceName { get; set; } = string.Empty;

    [JsonPropertyName("display_name")]
    public string DisplayName { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("startup_type")]
    public string StartupType { get; set; } = string.Empty;

    [JsonPropertyName("is_critical")]
    public bool IsCritical { get; set; }

    [JsonPropertyName("last_start_time")]
    public DateTime? LastStartTime { get; set; }

    [JsonPropertyName("process_id")]
    public int? ProcessId { get; set; }
}

public class SecurityHealth
{
    [JsonPropertyName("antivirus_status")]
    public string AntivirusStatus { get; set; } = "Unknown";

    [JsonPropertyName("antivirus_name")]
    public string AntivirusName { get; set; } = string.Empty;

    [JsonPropertyName("firewall_status")]
    public string FirewallStatus { get; set; } = "Unknown";

    [JsonPropertyName("windows_defender_status")]
    public string WindowsDefenderStatus { get; set; } = "Unknown";

    [JsonPropertyName("uac_enabled")]
    public bool UacEnabled { get; set; }

    [JsonPropertyName("bitlocker_status")]
    public string BitlockerStatus { get; set; } = "Unknown";

    [JsonPropertyName("last_security_scan")]
    public DateTime? LastSecurityScan { get; set; }

    [JsonPropertyName("security_updates_available")]
    public int SecurityUpdatesAvailable { get; set; }

    [JsonPropertyName("last_update_check")]
    public DateTime? LastUpdateCheck { get; set; }
}

public class AgentInfo
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0.0";

    [JsonPropertyName("build_date")]
    public DateTime BuildDate { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("uptime_seconds")]
    public long UptimeSeconds { get; set; }

    [JsonPropertyName("last_heartbeat")]
    public DateTime LastHeartbeat { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("scan_frequency_minutes")]
    public int ScanFrequencyMinutes { get; set; }

    [JsonPropertyName("total_scans_performed")]
    public long TotalScansPerformed { get; set; }

    [JsonPropertyName("last_successful_scan")]
    public DateTime? LastSuccessfulScan { get; set; }

    [JsonPropertyName("last_error")]
    public string? LastError { get; set; }

    [JsonPropertyName("error_count")]
    public int ErrorCount { get; set; }
} 