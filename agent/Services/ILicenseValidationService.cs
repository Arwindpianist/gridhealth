using System.Threading.Tasks;
using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services
{
    public interface ILicenseValidationService
    {
        Task<LicenseValidationResult> ValidateLicenseAsync(string licenseKey, string apiEndpoint);
    }

    public class LicenseValidationResult
    {
        public bool IsValid { get; set; }
        public string Message { get; set; }
        public string OrganizationName { get; set; }
        public int DeviceLimit { get; set; }
        public string LicenseType { get; set; }
    }
} 