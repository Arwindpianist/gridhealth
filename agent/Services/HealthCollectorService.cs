using System.Management;
using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Security.Principal;
using Microsoft.Win32;
using Microsoft.Extensions.Logging;
using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services;

public class HealthCollectorService : IHealthCollectorService
{
    private readonly ILogger<HealthCollectorService> _logger;
    private PerformanceCounter? _cpuCounter;
    private PerformanceCounter? _memoryCounter;
    private PerformanceCounter? _diskReadCounter;
    private PerformanceCounter? _diskWriteCounter;

    public HealthCollectorService(ILogger<HealthCollectorService> logger)
    {
        _logger = logger;
        
        // TEMPORARILY DISABLE PERFORMANCE COUNTERS TO FIX GUI HANGING ISSUE
        _logger.LogInformation("Performance counters disabled for debugging - GUI should now work");
        _cpuCounter = null;
        _memoryCounter = null;
        _diskReadCounter = null;
        _diskWriteCounter = null;
    }

    public async Task<HealthData?> CollectHealthDataAsync()
    {
        try
        {
            _logger.LogInformation("Starting health data collection...");

            var healthData = new HealthData
            {
                DeviceId = GetDeviceId(),
                LicenseKey = GetLicenseKey(),
                Timestamp = DateTime.UtcNow,
                SystemInfo = await CollectSystemInfoAsync(),
                PerformanceMetrics = await CollectPerformanceMetricsAsync(),
                DiskHealth = await CollectDiskHealthAsync(),
                MemoryHealth = await CollectMemoryHealthAsync(),
                NetworkHealth = await CollectNetworkHealthAsync(),
                ServiceHealth = await CollectServiceHealthAsync(),
                SecurityHealth = await CollectSecurityHealthAsync(),
                AgentInfo = await CollectAgentInfoAsync()
            };

            _logger.LogInformation("Health data collection completed successfully");
            return healthData;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to collect health data");
            return null;
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

    private string GetDeviceId()
    {
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT UUID FROM Win32_ComputerSystemProduct");
            foreach (ManagementObject obj in searcher.Get())
            {
                return obj["UUID"]?.ToString() ?? Environment.MachineName;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not get device UUID");
        }
        
        return Environment.MachineName;
    }

    private string GetLicenseKey()
    {
        try
        {
            var configPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), 
                "GridHealth", "agent-config.json");
            
            if (File.Exists(configPath))
            {
                var json = File.ReadAllText(configPath);
                var config = System.Text.Json.JsonSerializer.Deserialize<AgentConfiguration>(json);
                return config?.LicenseKey ?? string.Empty;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not read license key from config");
        }
        
        return string.Empty;
    }

    private async Task<SystemInfo> CollectSystemInfoAsync()
    {
        var systemInfo = new SystemInfo();
        
        try
        {
            systemInfo.Hostname = Environment.MachineName;
            systemInfo.OsName = Environment.OSVersion.Platform.ToString();
            systemInfo.OsVersion = Environment.OSVersion.Version.ToString();
            systemInfo.OsArchitecture = Environment.Is64BitOperatingSystem ? "64-bit" : "32-bit";
            systemInfo.MachineName = Environment.MachineName;
            systemInfo.ProcessorCount = Environment.ProcessorCount;
            systemInfo.Timezone = TimeZoneInfo.Local.Id;

            // Get detailed system information using WMI
            using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_ComputerSystem");
            foreach (ManagementObject obj in searcher.Get())
            {
                systemInfo.TotalPhysicalMemory = Convert.ToInt64(obj["TotalPhysicalMemory"]);
                systemInfo.Domain = obj["Domain"]?.ToString() ?? string.Empty;
                systemInfo.Workgroup = obj["WorkGroup"]?.ToString() ?? string.Empty;
                break;
            }

            // Get processor information
            using var processorSearcher = new ManagementObjectSearcher("SELECT * FROM Win32_Processor");
            foreach (ManagementObject obj in processorSearcher.Get())
            {
                systemInfo.ProcessorName = obj["Name"]?.ToString() ?? string.Empty;
                break;
            }

            // Get last boot time
            using var bootSearcher = new ManagementObjectSearcher("SELECT * FROM Win32_OperatingSystem");
            foreach (ManagementObject obj in bootSearcher.Get())
            {
                var lastBoot = obj["LastBootUpTime"]?.ToString();
                if (!string.IsNullOrEmpty(lastBoot))
                {
                    systemInfo.LastBootTime = ManagementDateTimeConverter.ToDateTime(lastBoot);
                }
                break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not collect complete system info");
        }

        return systemInfo;
    }

    private async Task<PerformanceMetrics> CollectPerformanceMetricsAsync()
    {
        var metrics = new PerformanceMetrics();
        
        try
        {
            // CPU Usage
            if (_cpuCounter != null)
            {
                metrics.CpuUsagePercent = Math.Round(_cpuCounter.NextValue(), 2);
            }

            // Memory Usage
            if (_memoryCounter != null)
            {
                var availableMB = _memoryCounter.NextValue();
                var totalMB = GC.GetTotalMemory(false) / (1024 * 1024);
                metrics.MemoryUsagePercent = Math.Round(((totalMB - availableMB) / totalMB) * 100, 2);
            }

            // Disk I/O
            if (_diskReadCounter != null)
            {
                metrics.DiskIoReadBytesPerSec = Math.Round(_diskReadCounter.NextValue(), 2);
            }
            
            if (_diskWriteCounter != null)
            {
                metrics.DiskIoWriteBytesPerSec = Math.Round(_diskWriteCounter.NextValue(), 2);
            }

            // Process and Thread counts
            var processes = Process.GetProcesses();
            metrics.ProcessCount = processes.Length;
            metrics.ThreadCount = processes.Sum(p => p.Threads.Count);
            metrics.HandleCount = processes.Sum(p => p.HandleCount);

            // Network metrics (simplified)
            var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces();
            foreach (var ni in networkInterfaces)
            {
                if (ni.OperationalStatus == OperationalStatus.Up)
                {
                    var stats = ni.GetIPv4Statistics();
                    metrics.NetworkBytesReceivedPerSec += stats.BytesReceived;
                    metrics.NetworkBytesSentPerSec += stats.BytesSent;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not collect complete performance metrics");
        }

        return metrics;
    }

    private async Task<List<DiskHealth>> CollectDiskHealthAsync()
    {
        var diskHealthList = new List<DiskHealth>();
        
        try
        {
            var drives = DriveInfo.GetDrives();
            
            foreach (var drive in drives)
            {
                if (drive.IsReady)
                {
                    var diskHealth = new DiskHealth
                    {
                        DriveLetter = drive.Name.TrimEnd('\\'),
                        VolumeName = drive.VolumeLabel,
                        FileSystem = drive.DriveFormat,
                        TotalSizeBytes = drive.TotalSize,
                        FreeSpaceBytes = drive.AvailableFreeSpace,
                        UsedSpaceBytes = drive.TotalSize - drive.AvailableFreeSpace,
                        FreeSpacePercent = Math.Round((double)drive.AvailableFreeSpace / drive.TotalSize * 100, 2),
                        IsSystemDrive = drive.Name.StartsWith(Path.GetPathRoot(Environment.SystemDirectory) ?? "C:"),
                        HealthStatus = GetDiskHealthStatus(drive),
                        SmartStatus = "Unknown" // Would require additional WMI queries for SMART data
                    };
                    
                    diskHealthList.Add(diskHealth);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not collect complete disk health");
        }

        return diskHealthList;
    }

    private string GetDiskHealthStatus(DriveInfo drive)
    {
        var freePercent = (double)drive.AvailableFreeSpace / drive.TotalSize * 100;
        
        return freePercent switch
        {
            >= 20 => "Healthy",
            >= 10 => "Warning",
            >= 5 => "Critical",
            _ => "Danger"
        };
    }

    private async Task<MemoryHealth> CollectMemoryHealthAsync()
    {
        var memoryHealth = new MemoryHealth();
        
        try
        {
            using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_OperatingSystem");
            foreach (ManagementObject obj in searcher.Get())
            {
                memoryHealth.TotalPhysicalMemoryBytes = Convert.ToInt64(obj["TotalVisibleMemorySize"]) * 1024;
                memoryHealth.AvailablePhysicalMemoryBytes = Convert.ToInt64(obj["FreePhysicalMemory"]) * 1024;
                memoryHealth.TotalVirtualMemoryBytes = Convert.ToInt64(obj["TotalVirtualMemorySize"]) * 1024;
                memoryHealth.AvailableVirtualMemoryBytes = Convert.ToInt64(obj["FreeVirtualMemory"]) * 1024;
                memoryHealth.PageFileSizeBytes = Convert.ToInt64(obj["SizeStoredInPagingFiles"]) * 1024;
                break;
            }

            memoryHealth.UsedPhysicalMemoryBytes = memoryHealth.TotalPhysicalMemoryBytes - memoryHealth.AvailablePhysicalMemoryBytes;
            memoryHealth.MemoryUsagePercent = Math.Round((double)memoryHealth.UsedPhysicalMemoryBytes / memoryHealth.TotalPhysicalMemoryBytes * 100, 2);
            
            memoryHealth.MemoryPressureLevel = memoryHealth.MemoryUsagePercent switch
            {
                < 70 => "Normal",
                < 85 => "Moderate",
                < 95 => "High",
                _ => "Critical"
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not collect complete memory health");
        }

        return memoryHealth;
    }

    private async Task<NetworkHealth> CollectNetworkHealthAsync()
    {
        var networkHealth = new NetworkHealth();
        
        try
        {
            var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces();
            networkHealth.NetworkAdapterCount = networkInterfaces.Length;
            networkHealth.ActiveConnections = GetActiveConnectionsCount();

            foreach (var ni in networkInterfaces)
            {
                if (ni.OperationalStatus == OperationalStatus.Up)
                {
                    var networkInterface = new NetworkInterfaceInfo
                    {
                        Name = ni.Name,
                        Description = ni.Description,
                        IsEnabled = ni.OperationalStatus == OperationalStatus.Up,
                        IsConnected = ni.OperationalStatus == OperationalStatus.Up,
                        SpeedMbps = ni.Speed / 1000000 // Convert to Mbps
                    };

                    // Get IP addresses
                    var ipProps = ni.GetIPProperties();
                    foreach (var ip in ipProps.UnicastAddresses)
                    {
                        if (ip.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                        {
                            networkInterface.IpAddresses.Add(ip.Address.ToString());
                        }
                    }

                    // Get MAC address
                    networkInterface.MacAddress = ni.GetPhysicalAddress().ToString();

                    networkHealth.NetworkInterfaces.Add(networkInterface);
                }
            }

            // Get DNS servers
            var dnsServers = GetDnsServers();
            networkHealth.DnsServers.AddRange(dnsServers);

            // Get default gateway
            networkHealth.DefaultGateway = GetDefaultGateway();

            // Test internet connectivity
            networkHealth.InternetConnectivity = await TestInternetConnectivityAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not collect complete network health");
        }

        return networkHealth;
    }

    private int GetActiveConnectionsCount()
    {
        try
        {
            var connections = IPGlobalProperties.GetIPGlobalProperties().GetActiveTcpConnections();
            return connections.Length;
        }
        catch
        {
            return 0;
        }
    }

    private List<string> GetDnsServers()
    {
        var dnsServers = new List<string>();
        
        try
        {
            var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces();
            foreach (var ni in networkInterfaces)
            {
                if (ni.OperationalStatus == OperationalStatus.Up)
                {
                    var ipProps = ni.GetIPProperties();
                    foreach (var dns in ipProps.DnsAddresses)
                    {
                        if (dns.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                        {
                            dnsServers.Add(dns.ToString());
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not get DNS servers");
        }

        return dnsServers.Distinct().ToList();
    }

    private string GetDefaultGateway()
    {
        try
        {
            var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces();
            foreach (var ni in networkInterfaces)
            {
                if (ni.OperationalStatus == OperationalStatus.Up)
                {
                    var ipProps = ni.GetIPProperties();
                    foreach (var gateway in ipProps.GatewayAddresses)
                    {
                        if (gateway.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                        {
                            return gateway.Address.ToString();
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not get default gateway");
        }

        return string.Empty;
    }

    private async Task<bool> TestInternetConnectivityAsync()
    {
        try
        {
            using var client = new HttpClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            
            var response = await client.GetAsync("http://www.google.com");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private async Task<List<ServiceHealth>> CollectServiceHealthAsync()
    {
        var serviceHealthList = new List<ServiceHealth>();
        
        try
        {
            var criticalServices = new[] { "spooler", "lanmanserver", "lanmanworkstation", "netlogon", "dns", "dhcp" };
            
            using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_Service");
            foreach (ManagementObject obj in searcher.Get())
            {
                var serviceName = obj["Name"]?.ToString() ?? string.Empty;
                var isCritical = criticalServices.Contains(serviceName.ToLower());
                
                if (isCritical)
                {
                    var serviceHealth = new ServiceHealth
                    {
                        ServiceName = serviceName,
                        DisplayName = obj["DisplayName"]?.ToString() ?? serviceName,
                        Status = obj["State"]?.ToString() ?? "Unknown",
                        StartupType = obj["StartMode"]?.ToString() ?? "Unknown",
                        IsCritical = isCritical,
                        ProcessId = obj["ProcessId"] != null ? Convert.ToInt32(obj["ProcessId"]) : null
                    };

                    if (obj["StartName"] != null)
                    {
                        serviceHealth.LastStartTime = DateTime.Now; // Simplified - would need more complex logic
                    }

                    serviceHealthList.Add(serviceHealth);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not collect complete service health");
        }

        return serviceHealthList;
    }

    private async Task<SecurityHealth> CollectSecurityHealthAsync()
    {
        var securityHealth = new SecurityHealth();
        
        try
        {
            // Check Windows Defender status
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT * FROM AntiVirusProduct");
                foreach (ManagementObject obj in searcher.Get())
                {
                    securityHealth.AntivirusName = obj["displayName"]?.ToString() ?? "Windows Defender";
                    securityHealth.AntivirusStatus = "Active";
                    break;
                }
            }
            catch
            {
                securityHealth.AntivirusStatus = "Unknown";
                securityHealth.AntivirusName = "Unknown";
            }

            // Check UAC status
            try
            {
                using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System");
                if (key != null)
                {
                    var uacValue = key.GetValue("EnableLUA");
                    securityHealth.UacEnabled = uacValue != null && Convert.ToInt32(uacValue) == 1;
                }
            }
            catch
            {
                securityHealth.UacEnabled = false;
            }

            // Check firewall status
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT * FROM FirewallProduct");
                foreach (ManagementObject obj in searcher.Get())
                {
                    securityHealth.FirewallStatus = "Active";
                    break;
                }
            }
            catch
            {
                securityHealth.FirewallStatus = "Unknown";
            }

            // Check BitLocker status
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT * FROM BitLocker");
                foreach (ManagementObject obj in searcher.Get())
                {
                    securityHealth.BitlockerStatus = "Active";
                    break;
                }
            }
            catch
            {
                securityHealth.BitlockerStatus = "Unknown";
            }

            // Check for Windows Updates
            try
            {
                using var searcher = new ManagementObjectSearcher("SELECT * FROM Win32_QuickFixEngineering");
                var updates = searcher.Get();
                securityHealth.SecurityUpdatesAvailable = 0; // Simplified - would need more complex logic
                securityHealth.LastUpdateCheck = DateTime.Now;
            }
            catch
            {
                securityHealth.SecurityUpdatesAvailable = 0;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not collect complete security health");
        }

        return securityHealth;
    }

    private async Task<AgentInfo> CollectAgentInfoAsync()
    {
        var agentInfo = new AgentInfo
        {
            Version = "1.0.0",
            BuildDate = DateTime.UtcNow,
            UptimeSeconds = (long)(DateTime.Now - Process.GetCurrentProcess().StartTime).TotalSeconds,
            LastHeartbeat = DateTime.UtcNow,
            ScanFrequencyMinutes = 1440, // Default to daily
            TotalScansPerformed = 0, // Would need to track this
            LastSuccessfulScan = DateTime.UtcNow,
            ErrorCount = 0 // Would need to track this
        };

        return agentInfo;
    }

    public void Dispose()
    {
        _cpuCounter?.Dispose();
        _memoryCounter?.Dispose();
        _diskReadCounter?.Dispose();
        _diskWriteCounter?.Dispose();
    }
} 