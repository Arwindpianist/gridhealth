using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services;

public interface IApiClientService
{
    Task<bool> SendHealthDataAsync(HealthData healthData, string apiEndpoint);
    Task<bool> TestConnectionAsync(string endpoint);
} 