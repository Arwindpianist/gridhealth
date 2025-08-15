using Microsoft.Extensions.Logging;
using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services;

public class ApiClientService : IApiClientService
{
    private readonly ILogger<ApiClientService> _logger;

    public ApiClientService(ILogger<ApiClientService> logger)
    {
        _logger = logger;
    }

    public async Task<bool> SendHealthDataAsync(HealthData healthData)
    {
        _logger.LogInformation("Sending health data to API");
        Console.WriteLine("📡 Sending health data to API...");
        
        try
        {
            // TODO: Implement actual API call
            await Task.Delay(100); // Simulate API call
            
            _logger.LogInformation("Health data sent successfully");
            Console.WriteLine($"✅ Health data sent successfully!");
            Console.WriteLine($"   📊 Data: {healthData.SystemHealth.Cpu.UsagePercent}% CPU, {healthData.SystemHealth.Memory.UsagePercent}% Memory");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send health data");
            Console.WriteLine($"❌ Failed to send health data: {ex.Message}");
            return false;
        }
    }
} 