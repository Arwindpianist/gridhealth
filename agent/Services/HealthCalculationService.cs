using System.Diagnostics;
using System.Management;
using System.Net.NetworkInformation;
using System.Security.Principal;
using Microsoft.Win32;
using GridHealth.Agent.Models;

namespace GridHealth.Agent.Services;

public class HealthCalculationService
{
    /// <summary>
    /// Calculate overall health score based on all system components
    /// </summary>
    public HealthScore CalculateOverallHealthScore(HealthData healthData)
    {
        try
        {
            var performanceScore = CalculatePerformanceScore(healthData.PerformanceMetrics);
            var diskScore = CalculateDiskHealthScore(healthData.DiskHealth);
            var memoryScore = CalculateMemoryHealthScore(healthData.MemoryHealth);
            var networkScore = CalculateNetworkHealthScore(healthData.NetworkHealth);
            var serviceScore = CalculateServiceHealthScore(healthData.ServiceHealth);
            var securityScore = CalculateSecurityHealthScore(healthData.SecurityHealth);

            // Weighted scoring system
            var overallScore = Math.Round(
                (performanceScore * 0.25) +
                (diskScore * 0.20) +
                (memoryScore * 0.20) +
                (networkScore * 0.15) +
                (serviceScore * 0.15) +
                (securityScore * 0.05)
            );

            return new HealthScore
            {
                Overall = Math.Max(0, Math.Min(100, (int)overallScore)),
                Performance = performanceScore,
                Disk = diskScore,
                Memory = memoryScore,
                Network = networkScore,
                Services = serviceScore,
                Security = securityScore,
                CalculatedAt = DateTime.UtcNow,
                Details = new HealthScoreDetails
                {
                    PerformanceDetails = GetPerformanceDetails(healthData.PerformanceMetrics),
                    DiskDetails = GetDiskDetails(healthData.DiskHealth),
                    MemoryDetails = GetMemoryDetails(healthData.MemoryHealth),
                    NetworkDetails = GetNetworkDetails(healthData.NetworkHealth),
                    ServiceDetails = GetServiceDetails(healthData.ServiceHealth),
                    SecurityDetails = GetSecurityDetails(healthData.SecurityHealth)
                }
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error calculating overall health score: {ex.Message}");
            return new HealthScore
            {
                Overall = 100,
                Performance = 100,
                Disk = 100,
                Memory = 100,
                Network = 100,
                Services = 100,
                Security = 100,
                CalculatedAt = DateTime.UtcNow
            };
        }
    }

    /// <summary>
    /// Calculate performance score based on CPU and memory usage
    /// </summary>
    private int CalculatePerformanceScore(PerformanceMetrics metrics)
    {
        try
        {
            var cpuScore = 100 - Math.Min(100, (int)metrics.CpuUsagePercent);
            var memoryScore = 100 - Math.Min(100, (int)metrics.MemoryUsagePercent);
            
            // Average of CPU and memory scores
            return Math.Max(0, Math.Min(100, (cpuScore + memoryScore) / 2));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error calculating performance score: {ex.Message}");
            return 100;
        }
    }

    /// <summary>
    /// Calculate disk health score based on usage and performance
    /// </summary>
    private int CalculateDiskHealthScore(List<DiskHealth> diskHealth)
    {
        try
        {
            if (diskHealth == null || diskHealth.Count == 0)
                return 100;

            var totalScore = 0;
            var validDisks = 0;

            foreach (var disk in diskHealth)
            {
                if (disk.FreeSpacePercent >= 0)
                {
                    var diskScore = Math.Min(100, (int)disk.FreeSpacePercent);
                    
                    // Penalize for low free space
                    if (disk.FreeSpacePercent < 10)
                        diskScore = Math.Max(0, diskScore - 30);
                    else if (disk.FreeSpacePercent < 20)
                        diskScore = Math.Max(0, diskScore - 15);

                    totalScore += diskScore;
                    validDisks++;
                }
            }

            return validDisks > 0 ? Math.Max(0, Math.Min(100, totalScore / validDisks)) : 100;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error calculating disk health score: {ex.Message}");
            return 100;
        }
    }

    /// <summary>
    /// Calculate memory health score
    /// </summary>
    private int CalculateMemoryHealthScore(MemoryHealth memoryHealth)
    {
        try
        {
            if (memoryHealth.MemoryUsagePercent >= 0)
            {
                var usage = memoryHealth.MemoryUsagePercent;
                var score = 100 - Math.Min(100, (int)usage);

                // Penalize for very high memory usage
                if (usage > 95)
                    score = Math.Max(0, score - 30);
                else if (usage > 90)
                    score = Math.Max(0, score - 20);
                else if (usage > 80)
                    score = Math.Max(0, score - 10);

                return Math.Max(0, Math.Min(100, score));
            }

            return 100;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error calculating memory health score: {ex.Message}");
            return 100;
        }
    }

    /// <summary>
    /// Calculate network health score
    /// </summary>
    private int CalculateNetworkHealthScore(NetworkHealth networkHealth)
    {
        try
        {
            var score = 100;

            // Check if any network interfaces are down
            if (networkHealth.NetworkInterfaces != null)
            {
                var totalInterfaces = networkHealth.NetworkInterfaces.Count;
                var connectedInterfaces = networkHealth.NetworkInterfaces.Count(ni => ni.IsConnected);

                if (totalInterfaces == 0)
                    score = 0;
                else if (connectedInterfaces == 0)
                    score = 0;
                else if (connectedInterfaces < totalInterfaces)
                    score = Math.Max(0, score - 20);

                // Check for network errors
                var interfacesWithErrors = networkHealth.NetworkInterfaces.Count(ni => 
                    ni.IsConnected && ni.SpeedMbps <= 0); // Very low speed might indicate issues

                if (interfacesWithErrors > 0)
                    score = Math.Max(0, score - 10);
            }

            return Math.Max(0, Math.Min(100, score));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error calculating network health score: {ex.Message}");
            return 100;
        }
    }

    /// <summary>
    /// Calculate service health score
    /// </summary>
    private int CalculateServiceHealthScore(List<ServiceHealth> serviceHealth)
    {
        try
        {
            if (serviceHealth == null || serviceHealth.Count == 0)
                return 100;

            var score = 100;
            var criticalServices = serviceHealth.Count(s => s.Status == "Stopped" || s.IsCritical);
            var warningServices = serviceHealth.Count(s => s.Status == "Warning");

            // Penalize for critical service failures
            if (criticalServices > 0)
                score = Math.Max(0, score - (criticalServices * 25));

            // Penalize for warning services
            if (warningServices > 0)
                score = Math.Max(0, score - (warningServices * 10));

            return Math.Max(0, Math.Min(100, score));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error calculating service health score: {ex.Message}");
            return 100;
        }
    }

    /// <summary>
    /// Calculate security health score
    /// </summary>
    private int CalculateSecurityHealthScore(SecurityHealth securityHealth)
    {
        try
        {
            var score = 100;

            // Check Windows Defender status
            if (securityHealth.WindowsDefenderStatus == "Disabled")
                score = Math.Max(0, score - 30);
            else if (securityHealth.WindowsDefenderStatus == "Warning")
                score = Math.Max(0, score - 15);

            // Check firewall status
            if (securityHealth.FirewallStatus == "Disabled")
                score = Math.Max(0, score - 25);
            else if (securityHealth.FirewallStatus == "Warning")
                score = Math.Max(0, score - 10);

            // Check UAC status
            if (!securityHealth.UacEnabled)
                score = Math.Max(0, score - 20);

            // Check for security updates
            if (securityHealth.SecurityUpdatesAvailable > 10)
                score = Math.Max(0, score - 15);
            else if (securityHealth.SecurityUpdatesAvailable > 5)
                score = Math.Max(0, score - 10);

            return Math.Max(0, Math.Min(100, score));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error calculating security health score: {ex.Message}");
            return 100;
        }
    }

    #region Detail Methods

    private object GetPerformanceDetails(PerformanceMetrics metrics)
    {
        return new
        {
            cpu_usage = metrics.CpuUsagePercent,
            memory_usage = metrics.MemoryUsagePercent,
            disk_io_read = metrics.DiskIoReadBytesPerSec,
            disk_io_write = metrics.DiskIoWriteBytesPerSec,
            network_received = metrics.NetworkBytesReceivedPerSec,
            network_sent = metrics.NetworkBytesSentPerSec,
            process_count = metrics.ProcessCount
        };
    }

    private object GetDiskDetails(List<DiskHealth> diskHealth)
    {
        if (diskHealth == null || diskHealth.Count == 0)
            return new { message = "No disk information available" };

        return diskHealth.Select(d => new
        {
            drive_letter = d.DriveLetter,
            free_space_percent = d.FreeSpacePercent,
            total_size_bytes = d.TotalSizeBytes,
            free_space_bytes = d.FreeSpaceBytes,
            health_status = d.HealthStatus
        }).ToList();
    }

    private object GetMemoryDetails(MemoryHealth memoryHealth)
    {
        return new
        {
            usage_percent = memoryHealth.MemoryUsagePercent,
            available_memory_bytes = memoryHealth.AvailablePhysicalMemoryBytes,
            total_memory_bytes = memoryHealth.TotalPhysicalMemoryBytes,
            page_file_size_bytes = memoryHealth.PageFileSizeBytes
        };
    }

    private object GetNetworkDetails(NetworkHealth networkHealth)
    {
        if (networkHealth.NetworkInterfaces == null)
            return new { message = "No network information available" };

        return networkHealth.NetworkInterfaces.Select(ni => new
        {
            name = ni.Name,
            is_connected = ni.IsConnected,
            speed_mbps = ni.SpeedMbps,
            mac_address = ni.MacAddress,
            ip_addresses = ni.IpAddresses
        }).ToList();
    }

    private object GetServiceDetails(List<ServiceHealth> serviceHealth)
    {
        if (serviceHealth == null || serviceHealth.Count == 0)
            return new { message = "No service information available" };

        return serviceHealth.Select(s => new
        {
            name = s.ServiceName,
            display_name = s.DisplayName,
            status = s.Status,
            start_type = s.StartupType,
            is_critical = s.IsCritical
        }).ToList();
    }

    private object GetSecurityDetails(SecurityHealth securityHealth)
    {
        return new
        {
            windows_defender_status = securityHealth.WindowsDefenderStatus,
            firewall_status = securityHealth.FirewallStatus,
            uac_enabled = securityHealth.UacEnabled,
            security_updates_available = securityHealth.SecurityUpdatesAvailable,
            last_security_scan = securityHealth.LastSecurityScan,
            antivirus_status = securityHealth.AntivirusStatus
        };
    }

    #endregion
}

/// <summary>
/// Comprehensive health score with component breakdowns
/// </summary>
public class HealthScore
{
    public int Overall { get; set; }
    public int Performance { get; set; }
    public int Disk { get; set; }
    public int Memory { get; set; }
    public int Network { get; set; }
    public int Services { get; set; }
    public int Security { get; set; }
    public DateTime CalculatedAt { get; set; }
    public HealthScoreDetails Details { get; set; } = new();
}

public class HealthScoreDetails
{
    public object PerformanceDetails { get; set; } = new();
    public object DiskDetails { get; set; } = new();
    public object MemoryDetails { get; set; } = new();
    public object NetworkDetails { get; set; } = new();
    public object ServiceDetails { get; set; } = new();
    public object SecurityDetails { get; set; } = new();
} 