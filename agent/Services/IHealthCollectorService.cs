namespace GridHealth.Agent.Services;

public interface IHealthCollectorService
{
    Task<Models.HealthData?> CollectHealthDataAsync();
    Task<bool> TestConnectionAsync(string endpoint);
} 