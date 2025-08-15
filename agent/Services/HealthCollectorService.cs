using Microsoft.Extensions.Logging;

namespace GridHealth.Agent.Services;

public class HealthCollectorService : IHealthCollectorService
{
    private readonly ILogger<HealthCollectorService> _logger;

    public HealthCollectorService(ILogger<HealthCollectorService> logger)
    {
        _logger = logger;
    }

    public Task CollectHealthMetricsAsync()
    {
        _logger.LogInformation("Health metrics collection started");
        return Task.CompletedTask;
    }
} 