using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services;

public interface IHealthScanner
{
    Task<HealthData> ScanAsync();
    Task<SystemInfo> GetSystemInfoAsync();
    Task<PerformanceMetrics> GetPerformanceMetricsAsync();
    Task<List<DiskHealth>> GetDiskHealthAsync();
    Task<MemoryHealth> GetMemoryHealthAsync();
    Task<NetworkHealth> GetNetworkHealthAsync();
    Task<List<ServiceHealth>> GetServiceHealthAsync();
    Task<SecurityHealth> GetSecurityHealthAsync();
    Task<bool> IsHealthyAsync();
    Task<TimeSpan> GetLastScanDurationAsync();
} 