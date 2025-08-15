using Microsoft.Extensions.Logging;

namespace GridHealth.Agent.Services;

public class MonitoringService : IMonitoringService
{
    private readonly ILogger<MonitoringService> _logger;

    public MonitoringService(ILogger<MonitoringService> logger)
    {
        _logger = logger;
    }

    public Task StartMonitoringAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Monitoring service started");
        return Task.CompletedTask;
    }
} 