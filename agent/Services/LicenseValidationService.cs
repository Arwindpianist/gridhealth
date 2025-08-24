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

        public LicenseValidationService()
        {
            _httpClient = new HttpClient();
            _httpClient.Timeout = TimeSpan.FromSeconds(30);
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

                if (response.IsSuccessStatusCode)
                {
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var result = JsonSerializer.Deserialize<LicenseValidationResult>(responseContent);

                    if (result != null)
                    {
                        return result;
                    }
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