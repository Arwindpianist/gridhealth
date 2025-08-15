using Microsoft.Extensions.Hosting;

namespace GridHealth.Agent.Services;

public interface IAgentService : IHostedService
{
    // Inherits StartAsync and StopAsync from IHostedService
} 