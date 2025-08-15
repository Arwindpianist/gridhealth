namespace GridHealth.Agent.Models;

public class HealthData
{
    public string DeviceId { get; set; } = string.Empty;
    public string OrganizationId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string ScanId { get; set; } = string.Empty;
    public SystemHealth SystemHealth { get; set; } = new();
    public ApplicationHealth ApplicationHealth { get; set; } = new();
    public AgentInfo AgentInfo { get; set; } = new();
}

public class SystemHealth
{
    public CpuHealth Cpu { get; set; } = new();
    public MemoryHealth Memory { get; set; } = new();
    public Dictionary<string, DiskHealth> Disks { get; set; } = new();
    public NetworkHealth Network { get; set; } = new();
}

public class CpuHealth
{
    public double UsagePercent { get; set; }
    public double Temperature { get; set; }
    public int ProcessCount { get; set; }
}

public class MemoryHealth
{
    public double TotalGb { get; set; }
    public double UsedGb { get; set; }
    public double AvailableGb { get; set; }
    public double UsagePercent { get; set; }
}

public class DiskHealth
{
    public double TotalGb { get; set; }
    public double UsedGb { get; set; }
    public double FreeGb { get; set; }
    public double UsagePercent { get; set; }
}

public class NetworkHealth
{
    public string Status { get; set; } = string.Empty;
    public double LatencyMs { get; set; }
    public double BandwidthMbps { get; set; }
}

public class ApplicationHealth
{
    public List<ServiceStatus> CriticalServices { get; set; } = new();
    public bool DiskSpaceWarning { get; set; }
    public bool MemoryWarning { get; set; }
}

public class ServiceStatus
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime LastCheck { get; set; }
}

public class AgentInfo
{
    public string Version { get; set; } = string.Empty;
    public DateTime LastUpdate { get; set; }
    public int ScanDurationMs { get; set; }
} 