using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services
{
    public class LicenseValidationService : ILicenseValidationService
    {
        private readonly HttpClient _httpClient;
        private readonly JsonSerializerOptions _jsonOptions;

        public LicenseValidationService()
        {
            _httpClient = new HttpClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
            
            // Configure JSON deserialization to be case-insensitive
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };
        }

        public async Task<LicenseValidationResult> ValidateLicenseAsync(string licenseKey, string apiEndpoint)
        {
            try
            {
                // Create validation request
                var request = new
                {
                    license_key = licenseKey,
                    action = "validate",
                    timestamp = DateTime.UtcNow
                };

                var json = JsonSerializer.Serialize(request);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                // Add license key to headers for authentication
                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("X-License-Key", licenseKey);

                // Send validation request
                // Use the API endpoint directly (it should be the base URL)
                var baseUrl = apiEndpoint.TrimEnd('/');
                var response = await _httpClient.PostAsync($"{baseUrl}/api/licenses/validate", content);

                Console.WriteLine($"🔍 License validation response status: {response.StatusCode}");
                Console.WriteLine($"🔍 License validation response headers: {string.Join(", ", response.Headers)}");

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"🔍 License validation response content: {responseContent}");
                    
                    try
                    {
                        var result = JsonSerializer.Deserialize<LicenseValidationResult>(responseContent, _jsonOptions);
                        Console.WriteLine($"🔍 Deserialized result: IsValid={result?.IsValid}, Message={result?.Message}, OrganizationName={result?.OrganizationName}, DeviceLimit={result?.DeviceLimit}, LicenseType={result?.LicenseType}");

                        if (result != null)
                        {
                            return result;
                        }
                        else
                        {
                            Console.WriteLine("❌ Deserialized result is null");
                        }
                    }
                    catch (JsonException ex)
                    {
                        Console.WriteLine($"❌ JSON deserialization error: {ex.Message}");
                        Console.WriteLine($"❌ Response content that failed to deserialize: {responseContent}");
                    }
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"❌ License validation failed with status {response.StatusCode}: {errorContent}");
                }

                // If we get here, the license is invalid
                return new LicenseValidationResult
                {
                    IsValid = false,
                    Message = $"License validation failed: {response.StatusCode}",
                    OrganizationName = "",
                    DeviceLimit = 0,
                    LicenseType = ""
                };
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"❌ HttpRequestException: {ex.Message}");
                return new LicenseValidationResult
                {
                    IsValid = false,
                    Message = $"Network error: {ex.Message}",
                    OrganizationName = "",
                    DeviceLimit = 0,
                    LicenseType = ""
                };
            }
            catch (TaskCanceledException)
            {
                Console.WriteLine("❌ Request timed out");
                return new LicenseValidationResult
                {
                    IsValid = false,
                    Message = "Request timed out. Please check your internet connection.",
                    OrganizationName = "",
                    DeviceLimit = 0,
                    LicenseType = ""
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Unexpected error: {ex.Message}");
                return new LicenseValidationResult
                {
                    IsValid = false,
                    Message = $"Validation error: {ex.Message}",
                    OrganizationName = "",
                    DeviceLimit = 0,
                    LicenseType = ""
                };
            }
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }
} 