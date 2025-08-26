using Microsoft.Extensions.Logging;
using GridHealth.Agent.Models;
using System.Net.Http;
using System.Text;

namespace GridHealth.Agent.Services;

public class ApiClientService : IApiClientService
{
    private readonly ILogger<ApiClientService> _logger;

    public ApiClientService(ILogger<ApiClientService> logger)
    {
        _logger = logger;
    }

    public async Task<bool> SendHealthDataAsync(HealthData healthData, string apiEndpoint)
    {
        _logger.LogInformation("Sending comprehensive health scan data to API");
        Console.WriteLine("📡 Sending comprehensive health scan data to API...");
        
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            
            // Add headers
            client.DefaultRequestHeaders.Add("User-Agent", "GridHealth-Agent/1.0");
            client.DefaultRequestHeaders.Add("X-License-Key", healthData.LicenseKey);
            
            // Restructure data to match database schema exactly
            var comprehensiveData = new
            {
                device_id = healthData.DeviceId,
                metric_type = "health_scan",
                value = healthData.HealthScore?.Overall ?? 0.0,
                unit = "score",
                timestamp = healthData.Timestamp,
                license_key = healthData.LicenseKey,
                system_info = healthData.SystemInfo,
                performance_metrics = healthData.PerformanceMetrics,
                disk_health = healthData.DiskHealth,
                memory_health = healthData.MemoryHealth,
                network_health = healthData.NetworkHealth,
                service_health = healthData.ServiceHealth,
                security_health = healthData.SecurityHealth,
                agent_info = healthData.AgentInfo,
                raw_data = new
                {
                    type = "health_scan",
                    health_score = healthData.HealthScore,
                    performance_metrics = healthData.PerformanceMetrics,
                    disk_health = healthData.DiskHealth,
                    memory_health = healthData.MemoryHealth,
                    network_health = healthData.NetworkHealth,
                    service_health = healthData.ServiceHealth,
                    security_health = healthData.SecurityHealth,
                    agent_info = healthData.AgentInfo,
                    system_info = healthData.SystemInfo
                }
            };
            
            // Serialize comprehensive health data
            var json = System.Text.Json.JsonSerializer.Serialize(comprehensiveData, new System.Text.Json.JsonSerializerOptions
            {
                // Remove CamelCase naming policy to keep exact field names the API expects
                // PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
            });
            
            // Debug: Log the exact JSON being sent
            Console.WriteLine($"🔍 JSON being sent to API:");
            Console.WriteLine(json);
            
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            
            // Send to health endpoint
            var response = await client.PostAsync($"{apiEndpoint}/api/health", content);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Comprehensive health scan data sent successfully");
                Console.WriteLine($"✅ Comprehensive health scan data sent successfully! Status: {response.StatusCode}");
                return true;
            }
            else
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("API returned error status: {StatusCode}, Content: {Content}", response.StatusCode, errorContent);
                Console.WriteLine($"❌ API error: {response.StatusCode} - {errorContent}");
                return false;
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP request failed when sending health data");
            Console.WriteLine($"❌ HTTP request failed: {ex.Message}");
            return false;
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "Request timeout when sending health data");
            Console.WriteLine($"❌ Request timeout: {ex.Message}");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send health data");
            Console.WriteLine($"❌ Failed to send health data: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> TestConnectionAsync(string endpoint)
    {
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            
            var response = await client.GetAsync($"{endpoint}/api/health");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Connection test failed");
            return false;
        }
    }
} 