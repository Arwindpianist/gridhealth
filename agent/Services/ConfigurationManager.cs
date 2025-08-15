using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services;

public class ConfigurationManager : IConfigurationManager
{
    private readonly ILogger<ConfigurationManager> _logger;
    private readonly string _configPath;
    private AgentConfiguration? _cachedConfiguration;

    public ConfigurationManager(ILogger<ConfigurationManager> logger)
    {
        _logger = logger;
        
        // Try local appsettings.json first, then fall back to ProgramData
        var localConfigPath = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
        var programDataPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "GridHealth",
            "config.json"
        );
        
        // Use local config if it exists, otherwise use ProgramData
        if (File.Exists(localConfigPath))
        {
            _configPath = localConfigPath;
            Console.WriteLine($"🔧 Using local configuration: {_configPath}");
        }
        else
        {
            _configPath = programDataPath;
            Console.WriteLine($"🔧 Using ProgramData configuration: {_configPath}");
            
            // Ensure directory exists
            var configDir = Path.GetDirectoryName(_configPath);
            if (!string.IsNullOrEmpty(configDir) && !Directory.Exists(configDir))
            {
                Directory.CreateDirectory(configDir);
            }
        }
    }

    public async Task<AgentConfiguration> LoadConfigurationAsync()
    {
        if (_cachedConfiguration != null)
            return _cachedConfiguration;

        try
        {
            if (File.Exists(_configPath))
            {
                var json = await File.ReadAllTextAsync(_configPath);
                Console.WriteLine($"📄 Raw JSON content: {json}");
                
                // Try to deserialize the entire JSON first
                var fullConfig = JsonConvert.DeserializeObject<dynamic>(json);
                
                // Get the keys safely
                var keys = new List<string>();
                try
                {
                    var jObject = fullConfig as Newtonsoft.Json.Linq.JObject;
                    if (jObject != null)
                    {
                        keys = jObject.Properties().Select(p => p.Name).ToList();
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"⚠️  Warning getting keys: {ex.Message}");
                }
                
                Console.WriteLine($"🔍 Full config keys: {string.Join(", ", keys)}");
                
                // Extract the Agent section
                if (fullConfig?.Agent != null)
                {
                    var agentSection = JsonConvert.SerializeObject(fullConfig.Agent);
                    Console.WriteLine($"🔧 Agent section: {agentSection}");
                    
                    // Deserialize just the Agent section
                    _cachedConfiguration = JsonConvert.DeserializeObject<AgentConfiguration>(agentSection) ?? new AgentConfiguration();
                }
                else
                {
                    Console.WriteLine("⚠️  No Agent section found in config, using defaults");
                    _cachedConfiguration = new AgentConfiguration();
                }
                
                _logger.LogInformation("Configuration loaded from {ConfigPath}", _configPath);
            }
            else
            {
                _cachedConfiguration = new AgentConfiguration();
                await SaveConfigurationAsync(_cachedConfiguration);
                _logger.LogInformation("New configuration created at {ConfigPath}", _configPath);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Configuration loading error: {ex.Message}");
            _logger.LogError(ex, "Failed to load configuration, using defaults");
            _cachedConfiguration = new AgentConfiguration();
        }

        return _cachedConfiguration;
    }

    public async Task SaveConfigurationAsync(AgentConfiguration configuration)
    {
        try
        {
            var json = JsonConvert.SerializeObject(configuration, Formatting.Indented);
            await File.WriteAllTextAsync(_configPath, json);
            _cachedConfiguration = configuration;
            _logger.LogInformation("Configuration saved to {ConfigPath}", _configPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save configuration to {ConfigPath}", _configPath);
            throw;
        }
    }

        public async Task<bool> IsEnrolledAsync()
    {
        var config = await LoadConfigurationAsync();
        var isEnrolled = !string.IsNullOrEmpty(config.OrganizationToken) && 
                        !string.IsNullOrEmpty(config.DeviceId) && 
                        !string.IsNullOrEmpty(config.OrganizationId);
        
        // For testing: show enrollment status and actual values
        Console.WriteLine($"🔍 Configuration values:");
        Console.WriteLine($"   OrganizationToken: '{config.OrganizationToken}' (Length: {config.OrganizationToken?.Length ?? 0})");
        Console.WriteLine($"   DeviceId: '{config.DeviceId}' (Length: {config.DeviceId?.Length ?? 0})");
        Console.WriteLine($"   OrganizationId: '{config.OrganizationId}' (Length: {config.OrganizationId?.Length ?? 0})");
        
        if (isEnrolled)
        {
            Console.WriteLine($"🔐 Enrollment check: Token={!string.IsNullOrEmpty(config.OrganizationToken)}, Device={!string.IsNullOrEmpty(config.DeviceId)}, Org={!string.IsNullOrEmpty(config.OrganizationId)}");
        }
        else
        {
            Console.WriteLine($"🔓 Not enrolled: Token={!string.IsNullOrEmpty(config.OrganizationToken)}, Device={!string.IsNullOrEmpty(config.DeviceId)}, Org={!string.IsNullOrEmpty(config.OrganizationId)}");
        }
        
        return isEnrolled;
    }

    public async Task<string?> GetOrganizationTokenAsync()
    {
        var config = await LoadConfigurationAsync();
        return config.OrganizationToken;
    }

    public async Task<string?> GetDeviceIdAsync()
    {
        var config = await LoadConfigurationAsync();
        return config.DeviceId;
    }

    public async Task<string?> GetOrganizationIdAsync()
    {
        var config = await LoadConfigurationAsync();
        return config.OrganizationId;
    }

    public async Task<string?> GetApiEndpointAsync()
    {
        var config = await LoadConfigurationAsync();
        return config.ApiEndpoint;
    }

    public async Task<int> GetScanIntervalMinutesAsync()
    {
        var config = await LoadConfigurationAsync();
        return config.ScanIntervalMinutes;
    }

    public async Task<bool> ValidateConfigurationAsync()
    {
        var config = await LoadConfigurationAsync();
        
        if (string.IsNullOrEmpty(config.ApiEndpoint))
        {
            _logger.LogError("API endpoint is not configured");
            return false;
        }

        if (string.IsNullOrEmpty(config.OrganizationToken))
        {
            _logger.LogError("Organization token is not configured");
            return false;
        }

        if (config.ScanIntervalMinutes < 1 || config.ScanIntervalMinutes > 60)
        {
            _logger.LogError("Scan interval must be between 1 and 60 minutes");
            return false;
        }

        return true;
    }
} 