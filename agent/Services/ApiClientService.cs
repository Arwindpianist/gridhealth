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
        _logger.LogInformation("Sending health data to API");
        Console.WriteLine("📡 Sending health data to API...");
        
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            
            // Add headers
            client.DefaultRequestHeaders.Add("User-Agent", "GridHealth-Agent/1.0");
            client.DefaultRequestHeaders.Add("X-License-Key", healthData.LicenseKey);
            
            // Serialize health data
            var json = System.Text.Json.JsonSerializer.Serialize(healthData, new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
            });
            
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
            
            // Send to health endpoint
            var response = await client.PostAsync($"{apiEndpoint}/api/health", content);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Health data sent successfully");
                Console.WriteLine($"✅ Health data sent successfully! Status: {response.StatusCode}");
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