namespace GridHealth.Agent.Services;

public interface IHealthCollectorService
{
    Task CollectHealthMetricsAsync();
} 