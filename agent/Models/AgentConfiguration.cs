namespace GridHealth.Agent.Models;

public enum ScanFrequency
{
    Daily = 1440,      // 24 hours in minutes
    Weekly = 10080,    // 7 days in minutes
    Monthly = 43200    // 30 days in minutes
}

public class AgentConfiguration
{
    public string? LicenseKey { get; set; }
    public string? OrganizationToken { get; set; }
    public string? DeviceId { get; set; }
    public string? OrganizationId { get; set; }
    public string ApiEndpoint { get; set; } = "https://gridhealth.arwindpianist.store";
    public ScanFrequency ScanFrequency { get; set; } = ScanFrequency.Daily;
    public int ScanIntervalMinutes { get; set; } = 1440; // Default to daily
    public int RetryAttempts { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 30;
    public string LogLevel { get; set; } = "info";
    public bool IsConfigured { get; set; } = false;
    public DateTime? LastConfigured { get; set; }
    public string? OrganizationName { get; set; }
    public int DeviceLimit { get; set; } = 0;
    public string? LicenseType { get; set; }
    public List<string> CustomChecks { get; set; } = new() { "disk_space", "memory_usage", "critical_services" };
    
    public void UpdateScanInterval()
    {
        ScanIntervalMinutes = (int)ScanFrequency;
    }
} 