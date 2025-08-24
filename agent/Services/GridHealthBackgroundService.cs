using System;
using System.ServiceProcess;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using GridHealth.Agent.Models;
using GridHealth.Agent.Services;

namespace GridHealth.Agent.Services
{
    public class GridHealthBackgroundService : BackgroundService
    {
        private readonly ILogger<GridHealthBackgroundService> _logger;
        private readonly IConfigurationManager _configManager;
        private readonly IHealthCollectorService _healthCollector;
        private readonly IApiClientService _apiClient;
        private System.Threading.Timer _monitoringTimer;
        private AgentConfiguration _config;

        public GridHealthBackgroundService(
            ILogger<GridHealthBackgroundService> logger,
            IConfigurationManager configManager,
            IHealthCollectorService healthCollector,
            IApiClientService apiClient)
        {
            _logger = logger;
            _configManager = configManager;
            _healthCollector = healthCollector;
            _apiClient = apiClient;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                _logger.LogInformation("GridHealth Background Service starting...");

                // Load configuration
                _config = await _configManager.LoadConfigurationAsync();
                if (_config == null || string.IsNullOrEmpty(_config.LicenseKey))
                {
                    _logger.LogError("No valid configuration found. Service cannot start.");
                    return;
                }

                _logger.LogInformation("Configuration loaded successfully. License: {LicenseKey}", 
                    _config.LicenseKey.Substring(0, Math.Min(10, _config.LicenseKey.Length)) + "...");

                // Start monitoring based on configured frequency
                StartMonitoring();

                // Keep the service running
                while (!stoppingToken.IsCancellationRequested)
                {
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GridHealth Background Service");
                throw;
            }
        }

        private void StartMonitoring()
        {
            try
            {
                // Calculate monitoring interval based on scan frequency
                int intervalMinutes = _config.ScanFrequency switch
                {
                    ScanFrequency.Daily => 1440,      // 24 hours
                    ScanFrequency.Weekly => 10080,    // 7 days
                    ScanFrequency.Monthly => 43200,   // 30 days
                    _ => 1440 // Default to daily
                };

                _logger.LogInformation("Starting monitoring with {Frequency} frequency (every {Interval} minutes)", 
                    _config.ScanFrequency, intervalMinutes);

                // Start the monitoring timer
                _monitoringTimer = new System.Threading.Timer(PerformHealthScan, null, TimeSpan.Zero, TimeSpan.FromMinutes(intervalMinutes));

                _logger.LogInformation("Monitoring started successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting monitoring");
            }
        }

        private async void PerformHealthScan(object state)
        {
            try
            {
                _logger.LogInformation("Performing scheduled health scan...");

                // Collect health data
                var healthData = await _healthCollector.CollectHealthDataAsync();
                if (healthData != null)
                {
                    // Send to API
                    var result = await _apiClient.SendHealthDataAsync(healthData, _config.ApiEndpoint);
                    if (result)
                    {
                        _logger.LogInformation("Health data sent successfully");
                    }
                    else
                    {
                        _logger.LogWarning("Failed to send health data");
                    }
                }
                else
                {
                    _logger.LogWarning("No health data collected");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during health scan");
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("GridHealth Background Service stopping...");

            // Stop the monitoring timer
            _monitoringTimer?.Change(Timeout.Infinite, 0);
            _monitoringTimer?.Dispose();

            await base.StopAsync(cancellationToken);
        }
    }
} 