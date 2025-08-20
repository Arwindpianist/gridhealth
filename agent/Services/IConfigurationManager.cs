using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services;

public interface IConfigurationManager
{
    Task<AgentConfiguration> LoadConfigurationAsync();
    Task SaveConfigurationAsync(AgentConfiguration configuration);
    Task<bool> IsEnrolledAsync();
    Task<string?> GetOrganizationTokenAsync();
    Task<string?> GetDeviceIdAsync();
    Task<string?> GetOrganizationIdAsync();
    Task<string?> GetLicenseKeyAsync();
    Task<string?> GetApiEndpointAsync();
    Task<int> GetScanIntervalMinutesAsync();
    Task<bool> ValidateConfigurationAsync();
} 