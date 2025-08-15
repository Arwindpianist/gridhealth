using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services;

public interface IHealthScanner
{
    Task<HealthData> ScanAsync();
    Task<SystemHealth> GetSystemHealthAsync();
    Task<ApplicationHealth> GetApplicationHealthAsync();
    Task<bool> IsHealthyAsync();
    Task<TimeSpan> GetLastScanDurationAsync();
} 