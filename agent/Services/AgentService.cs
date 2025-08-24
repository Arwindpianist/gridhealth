using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services;

public class AgentService : BackgroundService, IAgentService
{
    private readonly ILogger<AgentService> _logger;
    private readonly IHealthScanner _healthScanner;
    private readonly IApiClientService _apiClient;
    private readonly IConfigurationManager _configManager;
    private readonly IOptions<AgentConfiguration> _config;

    public AgentService(
        ILogger<AgentService> logger,
        IHealthScanner healthScanner,
        IApiClientService apiClient,
        IConfigurationManager configManager,
        IOptions<AgentConfiguration> config)
    {
        _logger = logger;
        _healthScanner = healthScanner;
        _apiClient = apiClient;
        _configManager = configManager;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        Console.WriteLine("🔄 ExecuteAsync method started!");
        _logger.LogInformation("GridHealth Agent service starting");
        
        // Check if we're in console mode and show enrollment status
        var isEnrolled = await _configManager.IsEnrolledAsync();
        if (isEnrolled)
        {
            Console.WriteLine("✅ Device is enrolled and ready for monitoring!");
            Console.WriteLine($"📊 Organization: {await _configManager.GetOrganizationIdAsync()}");
            Console.WriteLine($"🖥️  Device ID: {await _configManager.GetDeviceIdAsync()}");
            Console.WriteLine($"🔗 API Endpoint: {await _configManager.GetApiEndpointAsync()}");
        }
        else
        {
            Console.WriteLine("⏳ Device not enrolled, waiting for configuration...");
            // Wait for configuration to be ready
            while (!stoppingToken.IsCancellationRequested && !await _configManager.IsEnrolledAsync())
            {
                _logger.LogInformation("Waiting for device enrollment...");
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
            
            if (stoppingToken.IsCancellationRequested)
                return;
        }
            
        _logger.LogInformation("Device enrolled, starting health monitoring");
        Console.WriteLine("🚀 Starting health monitoring...");
        
        var scanInterval = TimeSpan.FromMinutes(_config.Value.ScanIntervalMinutes);
        Console.WriteLine($"⏱️  Scan interval: {scanInterval.TotalMinutes} minutes");
        
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogDebug("Starting health scan");
                Console.WriteLine($"\n🔍 Starting health scan at {DateTime.Now:HH:mm:ss}...");
                
                var healthData = await _healthScanner.ScanAsync();
                Console.WriteLine("📊 Health data collected:");
                Console.WriteLine($"   CPU: {healthData.PerformanceMetrics.CpuUsagePercent}% usage");
                Console.WriteLine($"   Memory: {healthData.PerformanceMetrics.MemoryUsagePercent}% usage ({healthData.MemoryHealth.UsedPhysicalMemoryBytes / (1024 * 1024 * 1024):F1}GB / {healthData.MemoryHealth.TotalPhysicalMemoryBytes / (1024 * 1024 * 1024):F1}GB)");
                Console.WriteLine($"   Disks: {healthData.DiskHealth.Count} drives monitored");
                Console.WriteLine($"   Network: {healthData.NetworkHealth.NetworkAdapterCount} adapters");
                
                Console.WriteLine("📡 Attempting to send data to API...");
                await _apiClient.SendHealthDataAsync(healthData, _config.Value.ApiEndpoint);
                Console.WriteLine("✅ Health data sent successfully!");
                
                _logger.LogDebug("Health scan completed, waiting {Interval} until next scan", scanInterval);
                Console.WriteLine($"⏳ Next scan in {scanInterval.TotalMinutes} minute(s)...");
                await Task.Delay(scanInterval, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health scan failed");
                Console.WriteLine($"❌ Health scan failed: {ex.Message}");
                
                // Wait a shorter time before retrying
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        Console.WriteLine("🚀 AgentService.StartAsync called!");
        _logger.LogInformation("GridHealth Agent service starting");
        await base.StartAsync(cancellationToken);
        Console.WriteLine("✅ AgentService.StartAsync completed!");
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("GridHealth Agent service stopping");
        await base.StopAsync(cancellationToken);
    }
} 