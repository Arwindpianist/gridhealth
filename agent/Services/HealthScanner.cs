using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Management;
using System.ServiceProcess;
using GridHealth.Agent.Models;
using GridHealth.Agent.Services;

namespace GridHealth.Agent.Services;

public class HealthScanner : IHealthScanner
{
    private readonly ILogger<HealthScanner> _logger;
    private readonly IConfigurationManager _configManager;
    private TimeSpan _lastScanDuration = TimeSpan.Zero;

    public HealthScanner(ILogger<HealthScanner> logger, IConfigurationManager configManager)
    {
        _logger = logger;
        _configManager = configManager;
    }

    public async Task<HealthData> ScanAsync()
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Starting health scan");
            Console.WriteLine("🔍 Collecting system health data...");
            
            var deviceId = await _configManager.GetDeviceIdAsync() ?? "unknown";
            var organizationId = await _configManager.GetOrganizationIdAsync() ?? "unknown";
            
            var healthData = new HealthData
            {
                DeviceId = deviceId,
                OrganizationId = organizationId,
                Timestamp = DateTime.UtcNow,
                ScanId = Guid.NewGuid().ToString(),
                SystemHealth = await GetSystemHealthAsync(),
                ApplicationHealth = await GetApplicationHealthAsync(),
                AgentInfo = new AgentInfo
                {
                    Version = "1.0.0",
                    LastUpdate = DateTime.UtcNow,
                    ScanDurationMs = 0 // Will be set after scan
                }
            };

            stopwatch.Stop();
            _lastScanDuration = stopwatch.Elapsed;
            healthData.AgentInfo.ScanDurationMs = (int)stopwatch.ElapsedMilliseconds;
            
            _logger.LogInformation("Health scan completed in {Duration}ms", stopwatch.ElapsedMilliseconds);
            Console.WriteLine($"✅ Health scan completed in {stopwatch.ElapsedMilliseconds}ms!");
            return healthData;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _lastScanDuration = stopwatch.Elapsed;
            _logger.LogError(ex, "Health scan failed after {Duration}ms", stopwatch.ElapsedMilliseconds);
            throw;
        }
    }

    public async Task<SystemHealth> GetSystemHealthAsync()
    {
        return new SystemHealth
        {
            Cpu = await GetCpuHealthAsync(),
            Memory = await GetMemoryHealthAsync(),
            Disks = await GetDiskHealthAsync(),
            Network = await GetNetworkHealthAsync()
        };
    }

    public async Task<ApplicationHealth> GetApplicationHealthAsync()
    {
        return new ApplicationHealth
        {
            CriticalServices = await GetCriticalServicesAsync(),
            DiskSpaceWarning = await CheckDiskSpaceWarningAsync(),
            MemoryWarning = await CheckMemoryWarningAsync()
        };
    }

    public Task<bool> IsHealthyAsync()
    {
        // Basic health check - can be expanded
        return Task.FromResult(true);
    }

    public Task<TimeSpan> GetLastScanDurationAsync()
    {
        return Task.FromResult(_lastScanDuration);
    }

    private async Task<CpuHealth> GetCpuHealthAsync()
    {
        try
        {
            var cpuCounter = new PerformanceCounter("Processor", "% Processor Time", "_Total");
            cpuCounter.NextValue(); // First call returns 0, second call returns actual value
            await Task.Delay(1000); // Wait 1 second for accurate reading
            
            var usage = cpuCounter.NextValue();
            
            return new CpuHealth
            {
                UsagePercent = Math.Round(usage, 1),
                Temperature = 0, // Would need additional hardware monitoring
                ProcessCount = Process.GetProcesses().Length
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get CPU health");
            return new CpuHealth();
        }
    }

    private Task<MemoryHealth> GetMemoryHealthAsync()
    {
        try
        {
            // Use PerformanceCounter for memory information
            var totalMemoryCounter = new PerformanceCounter("Memory", "Available MBytes");
            var totalMemory = totalMemoryCounter.NextValue();
            
            // Get total physical memory from WMI
            var searcher = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem");
            var collection = searcher.Get();
            var totalPhysicalMemory = 0L;
            
            foreach (ManagementObject obj in collection)
            {
                totalPhysicalMemory = Convert.ToInt64(obj["TotalPhysicalMemory"]);
                break;
            }
            
            var totalMemoryBytes = totalPhysicalMemory;
            var availableMemoryBytes = totalMemory * 1024 * 1024; // Convert MB to bytes
            var usedMemoryBytes = totalMemoryBytes - availableMemoryBytes;
            
            var totalGb = Math.Round(totalMemoryBytes / (1024.0 * 1024.0 * 1024.0), 1);
            var usedGb = Math.Round(usedMemoryBytes / (1024.0 * 1024.0 * 1024.0), 1);
            var availableGb = Math.Round(availableMemoryBytes / (1024.0 * 1024.0 * 1024.0), 1);
            var usagePercent = Math.Round((usedMemoryBytes * 100.0) / totalMemoryBytes, 1);
            
            return Task.FromResult(new MemoryHealth
            {
                TotalGb = totalGb,
                UsedGb = usedGb,
                AvailableGb = availableGb,
                UsagePercent = usagePercent
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get memory health");
            return Task.FromResult(new MemoryHealth());
        }
    }

    private async Task<Dictionary<string, DiskHealth>> GetDiskHealthAsync()
    {
        var disks = new Dictionary<string, DiskHealth>();
        
        try
        {
            var drives = DriveInfo.GetDrives().Where(d => d.DriveType == DriveType.Fixed);
            
            foreach (var drive in drives)
            {
                try
                {
                    var totalGb = Math.Round(drive.TotalSize / (1024.0 * 1024.0 * 1024.0), 1);
                    var usedGb = Math.Round((drive.TotalSize - drive.AvailableFreeSpace) / (1024.0 * 1024.0 * 1024.0), 1);
                    var freeGb = Math.Round(drive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0), 1);
                    var usagePercent = Math.Round(((drive.TotalSize - drive.AvailableFreeSpace) * 100.0) / drive.TotalSize, 1);
                    
                    disks[drive.Name] = new DiskHealth
                    {
                        TotalGb = totalGb,
                        UsedGb = usedGb,
                        FreeGb = freeGb,
                        UsagePercent = usagePercent
                    };
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get disk health for {Drive}", drive.Name);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get disk health");
        }
        
        return disks;
    }

    private async Task<NetworkHealth> GetNetworkHealthAsync()
    {
        try
        {
            // Basic network status check
            var isConnected = System.Net.NetworkInformation.NetworkInterface.GetIsNetworkAvailable();
            
            return new NetworkHealth
            {
                Status = isConnected ? "connected" : "disconnected",
                LatencyMs = 0, // Would need ping test to specific endpoint
                BandwidthMbps = 0 // Would need bandwidth testing
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get network health");
            return new NetworkHealth { Status = "unknown" };
        }
    }

    private async Task<List<ServiceStatus>> GetCriticalServicesAsync()
    {
        var services = new List<ServiceStatus>();
        
        try
        {
            var criticalServiceNames = new[] { "WinDefend", "wuauserv", "spooler" };
            
            foreach (var serviceName in criticalServiceNames)
            {
                try
                {
                    var service = new ServiceController(serviceName);
                    services.Add(new ServiceStatus
                    {
                        Name = serviceName,
                        Status = service.Status.ToString().ToLower(),
                        LastCheck = DateTime.UtcNow
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed to get service status for {Service}", serviceName);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get critical services");
        }
        
        return services;
    }

    private async Task<bool> CheckDiskSpaceWarningAsync()
    {
        try
        {
            var cDrive = DriveInfo.GetDrives().FirstOrDefault(d => d.Name == "C:\\");
            if (cDrive != null)
            {
                var usagePercent = ((cDrive.TotalSize - cDrive.AvailableFreeSpace) * 100.0) / cDrive.TotalSize;
                return usagePercent > 90; // Warning if >90% used
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check disk space warning");
        }
        
        return false;
    }

    private async Task<bool> CheckMemoryWarningAsync()
    {
        try
        {
            // Get total physical memory from WMI
            var searcher = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem");
            var collection = searcher.Get();
            var totalPhysicalMemory = 0L;
            
            foreach (ManagementObject obj in collection)
            {
                totalPhysicalMemory = Convert.ToInt64(obj["TotalPhysicalMemory"]);
                break;
            }
            
            // Get available memory from PerformanceCounter
            var availableMemoryCounter = new PerformanceCounter("Memory", "Available MBytes");
            var availableMemory = availableMemoryCounter.NextValue();
            var availableMemoryBytes = availableMemory * 1024 * 1024; // Convert MB to bytes
            
            var usagePercent = ((totalPhysicalMemory - availableMemoryBytes) * 100.0) / totalPhysicalMemory;
            return usagePercent > 85; // Warning if >85% used
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check memory warning");
        }
        
        return false;
    }
} 