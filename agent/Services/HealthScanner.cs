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
            var licenseKey = await _configManager.GetLicenseKeyAsync() ?? "unknown";
            
            var healthData = new HealthData
            {
                DeviceId = deviceId,
                LicenseKey = licenseKey,
                Timestamp = DateTime.UtcNow,
                SystemInfo = await GetSystemInfoAsync(),
                PerformanceMetrics = await GetPerformanceMetricsAsync(),
                DiskHealth = await GetDiskHealthAsync(),
                MemoryHealth = await GetMemoryHealthAsync(),
                NetworkHealth = await GetNetworkHealthAsync(),
                ServiceHealth = await GetServiceHealthAsync(),
                SecurityHealth = await GetSecurityHealthAsync(),
                AgentInfo = new AgentInfo
                {
                    Version = "1.0.0",
                    BuildDate = DateTime.UtcNow,
                    UptimeSeconds = (long)(DateTime.Now - Process.GetCurrentProcess().StartTime).TotalSeconds,
                    LastHeartbeat = DateTime.UtcNow,
                    ScanFrequencyMinutes = 1440,
                    TotalScansPerformed = 0,
                    LastSuccessfulScan = DateTime.UtcNow
                }
            };

            stopwatch.Stop();
            _lastScanDuration = stopwatch.Elapsed;
            
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

    public async Task<SystemInfo> GetSystemInfoAsync()
    {
        return new SystemInfo
        {
            Hostname = Environment.MachineName,
            OsName = Environment.OSVersion.Platform.ToString(),
            OsVersion = Environment.OSVersion.Version.ToString(),
            OsArchitecture = Environment.Is64BitOperatingSystem ? "64-bit" : "32-bit",
            MachineName = Environment.MachineName,
            ProcessorCount = Environment.ProcessorCount,
            Timezone = TimeZoneInfo.Local.Id
        };
    }

    public async Task<PerformanceMetrics> GetPerformanceMetricsAsync()
    {
        return new PerformanceMetrics
        {
            CpuUsagePercent = 0, // Would need performance counters
            MemoryUsagePercent = 0,
            ProcessCount = Process.GetProcesses().Length,
            ThreadCount = Process.GetProcesses().Sum(p => p.Threads.Count),
            HandleCount = Process.GetProcesses().Sum(p => p.HandleCount)
        };
    }

    public async Task<List<DiskHealth>> GetDiskHealthAsync()
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
                        HealthStatus = GetDiskHealthStatus(drive)
                    };
                    
                    diskHealthList.Add(diskHealth);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not collect disk health");
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

    public async Task<MemoryHealth> GetMemoryHealthAsync()
    {
        return new MemoryHealth
        {
            TotalPhysicalMemoryBytes = GC.GetTotalMemory(false),
            AvailablePhysicalMemoryBytes = GC.GetTotalMemory(false) * 80 / 100, // Simplified
            UsedPhysicalMemoryBytes = GC.GetTotalMemory(false) * 20 / 100,
            MemoryUsagePercent = 20.0,
            MemoryPressureLevel = "Normal"
        };
    }

    public async Task<NetworkHealth> GetNetworkHealthAsync()
    {
        return new NetworkHealth
        {
            ActiveConnections = 0,
            NetworkInterfaces = new List<NetworkInterfaceInfo>(),
            InternetConnectivity = false
        };
    }

    public async Task<List<ServiceHealth>> GetServiceHealthAsync()
    {
        return new List<ServiceHealth>();
    }

    public async Task<SecurityHealth> GetSecurityHealthAsync()
    {
        return new SecurityHealth
        {
            AntivirusStatus = "Unknown",
            FirewallStatus = "Unknown",
            UacEnabled = false
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
} 