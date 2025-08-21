using System;
using System.ServiceProcess;
using System.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GridHealth.Agent.Services
{
    public partial class GridHealthWindowsService : ServiceBase
    {
        private IHost _host;
        private readonly ILogger<GridHealthWindowsService> _logger;

        public GridHealthWindowsService()
        {
            ServiceName = "GridHealthAgent";
            CanStop = true;
            CanPauseAndContinue = false;
            AutoLog = true;
        }

        protected override void OnStart(string[] args)
        {
            try
            {
                // Create and configure the host
                _host = CreateHostBuilder(args).Build();
                
                // Start the background service
                _host.Start();
                
                EventLog.WriteEntry("GridHealth Agent Service started successfully", EventLogEntryType.Information);
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry($"Failed to start GridHealth Agent Service: {ex.Message}", EventLogEntryType.Error);
                throw;
            }
        }

        protected override void OnStop()
        {
            try
            {
                _host?.StopAsync().Wait();
                _host?.Dispose();
                
                EventLog.WriteEntry("GridHealth Agent Service stopped successfully", EventLogEntryType.Information);
            }
            catch (Exception ex)
            {
                EventLog.WriteEntry($"Error stopping GridHealth Agent Service: {ex.Message}", EventLogEntryType.Error);
            }
        }

        private static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .UseWindowsService(options =>
                {
                    options.ServiceName = "GridHealthAgent";
                })
                .ConfigureServices((hostContext, services) =>
                {
                    // Add the background service
                    services.AddHostedService<GridHealthBackgroundService>();
                    
                    // Add other services as needed
                    services.AddSingleton<IConfigurationManager, ConfigurationManager>();
                    services.AddSingleton<IHealthCollectorService, HealthCollectorService>();
                    services.AddSingleton<IApiClientService, ApiClientService>();
                })
                .ConfigureLogging((hostContext, logging) =>
                {
                    logging.ClearProviders();
                    logging.AddEventLog(settings =>
                    {
                        settings.SourceName = "GridHealthAgent";
                    });
                    logging.AddFile("logs/gridhealth-agent-{Date}.txt");
                });
    }
} 