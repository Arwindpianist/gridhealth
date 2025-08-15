namespace GridHealth.Agent.Models;

public class AgentConfiguration
{
    public string? OrganizationToken { get; set; }
    public string? DeviceId { get; set; }
    public string? OrganizationId { get; set; }
    public string ApiEndpoint { get; set; } = "https://gridhealth.arwindpianist.store";
    public int ScanIntervalMinutes { get; set; } = 5;
    public int RetryAttempts { get; set; } = 3;
    public int RetryDelaySeconds { get; set; } = 30;
    public string LogLevel { get; set; } = "info";
    public List<string> CustomChecks { get; set; } = new() { "disk_space", "memory_usage", "critical_services" };
} 