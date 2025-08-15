namespace GridHealth.Agent.Services;

public interface IMonitoringService
{
    Task StartMonitoringAsync(CancellationToken cancellationToken);
} 