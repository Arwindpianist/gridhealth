# GridHealth Agent Specification

## 🎯 **Overview**
A lightweight Windows service agent that runs in the background on client devices, performing periodic health scans and sending data to the GridHealth API. Designed for easy deployment by IT support teams.

## 🚀 **Current Status**
- ✅ **Basic Structure**: Windows Forms application with service architecture
- ✅ **Service Interfaces**: IAgentService, IMonitoringService, etc.
- ✅ **Build Status**: Successfully building with .NET 8.0-windows
- ✅ **Foundation**: Ready for lightweight background service implementation

---

## 🏗️ **Architecture Overview**

### **Data Flow**
```
Client Device → GridHealth Agent → gridhealth.arwindpianist.store API → Supabase → Dashboard
```

### **Agent Components**
- **Background Service**: Windows service running continuously
- **Health Scanner**: Periodic system health checks
- **Data Collector**: Gather system metrics and health data
- **API Client**: HTTP communication with GridHealth API
- **Configuration Manager**: Local settings and organization details
- **Logging System**: Local and remote logging capabilities

---

## 🔧 **Core Functionality**

### **1. Background Service**
- **Windows Service**: Runs automatically on system startup
- **Minimal Resource Usage**: <5% CPU, <50MB RAM
- **Silent Operation**: No user interface, no popups
- **Auto-restart**: Automatic recovery from failures

### **2. Health Scanning**
- **Scan Frequency**: Every 5 minutes (configurable)
- **System Metrics**: CPU, memory, disk, network
- **Application Health**: Running services, application status
- **Custom Checks**: Configurable health indicators

### **3. Data Transmission**
- **JSON Format**: Clean, structured data payloads
- **HTTP POST**: RESTful API communication
- **Retry Logic**: Automatic retry on failures
- **Offline Buffering**: Store data when network unavailable

---

## 📊 **Data Collection & Transmission**

### **Health Metrics Collected**
```json
{
  "device_id": "CLIENT-001-ABC123",
  "organization_id": "org-uuid-from-config",
  "timestamp": "2024-01-15T10:30:00Z",
  "scan_id": "scan-uuid",
  "system_health": {
    "cpu": {
      "usage_percent": 45.2,
      "temperature": 65.0,
      "process_count": 156
    },
    "memory": {
      "total_gb": 16.0,
      "used_gb": 10.8,
      "available_gb": 5.2,
      "usage_percent": 67.5
    },
    "disk": {
      "c_drive": {
        "total_gb": 512.0,
        "used_gb": 387.2,
        "free_gb": 124.8,
        "usage_percent": 75.6
      }
    },
    "network": {
      "status": "connected",
      "latency_ms": 12.5,
      "bandwidth_mbps": 100.0
    }
  },
  "application_health": {
    "critical_services": [
      {
        "name": "Windows Update",
        "status": "running",
        "last_check": "2024-01-15T10:25:00Z"
      }
    ],
    "disk_space_warning": false,
    "memory_warning": false
  },
  "agent_info": {
    "version": "1.0.0",
    "last_update": "2024-01-15T09:00:00Z",
    "scan_duration_ms": 1250
  }
}
```

### **API Endpoints**
```
POST /api/v1/devices/{device_id}/health
POST /api/v1/devices/{device_id}/enroll
GET  /api/v1/devices/{device_id}/config
POST /api/v1/devices/{device_id}/heartbeat
```

---

## 🔐 **Device Registration & Organization**

### **Installation Process**
1. **IT Support Downloads**: Agent installer from GridHealth portal
2. **Installation**: Silent MSI installation with organization token
3. **First Run**: Agent enrolls device using organization token
4. **Configuration**: Receives device-specific settings from API
5. **Activation**: Device becomes active in organization

### **Organization Identification**
- **Installation Token**: Provided by IT support during installation
- **Configuration File**: `%ProgramData%\GridHealth\config.json`
- **API Communication**: Sends organization token with each request
- **Device ID**: Generated based on hardware fingerprint + organization

### **Configuration File Structure**
```json
{
  "organization_token": "org-abc123-def456",
  "device_id": "CLIENT-001-ABC123",
  "organization_id": "org-uuid",
  "api_endpoint": "https://gridhealth.arwindpianist.store",
  "scan_interval_minutes": 5,
  "retry_attempts": 3,
  "retry_delay_seconds": 30,
  "log_level": "info",
  "custom_checks": [
    "disk_space",
    "memory_usage",
    "critical_services"
  ]
}
```

---

## 🚀 **Deployment Strategy**

### **Single Device Installation**
- **MSI Package**: Windows installer with silent installation
- **Organization Token**: Required during installation
- **Auto-startup**: Service starts automatically
- **No User Interaction**: Completely silent operation

### **Installation Commands**
```batch
# Silent installation with organization token
msiexec /i GridHealthAgent.msi /quiet ORG_TOKEN=org-abc123-def456

# Uninstall
msiexec /x GridHealthAgent.msi /quiet
```

### **Future Multi-Device Deployment**
- **Group Policy**: Active Directory deployment
- **SCCM Integration**: Microsoft System Center deployment
- **Scripted Installation**: PowerShell deployment scripts
- **Bulk Registration**: CSV-based device registration

---

## 🔧 **Technical Implementation**

### **Service Architecture**
```csharp
public class GridHealthAgentService : BackgroundService
{
    private readonly IHealthScanner _healthScanner;
    private readonly IApiClient _apiClient;
    private readonly IConfigurationManager _configManager;
    private readonly ILogger _logger;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var healthData = await _healthScanner.ScanAsync();
                await _apiClient.SendHealthDataAsync(healthData);
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health scan failed");
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }
    }
}
```

### **Health Scanner Implementation**
```csharp
public class HealthScanner : IHealthScanner
{
    public async Task<HealthData> ScanAsync()
    {
        var healthData = new HealthData
        {
            DeviceId = GetDeviceId(),
            OrganizationId = GetOrganizationId(),
            Timestamp = DateTime.UtcNow,
            SystemHealth = await GetSystemHealthAsync(),
            ApplicationHealth = await GetApplicationHealthAsync()
        };
        
        return healthData;
    }
    
    private async Task<SystemHealth> GetSystemHealthAsync()
    {
        // CPU, memory, disk, network monitoring
        // Using PerformanceCounter and WMI
    }
}
```

---

## 📱 **User Experience**

### **Installation Experience**
- **Silent Installation**: No user prompts or interruptions
- **Progress Indicator**: Optional progress bar for IT support
- **Installation Log**: Detailed log file for troubleshooting
- **Success Confirmation**: Simple success/failure notification

### **Operation Experience**
- **Background Operation**: Completely invisible to end users
- **No Popups**: No notifications or interruptions
- **Resource Efficient**: Minimal impact on system performance
- **Self-healing**: Automatic recovery from issues

### **IT Support Experience**
- **Easy Deployment**: Simple MSI installation
- **Configuration**: Single configuration file
- **Monitoring**: Service status and logs
- **Troubleshooting**: Comprehensive logging and diagnostics

---

## 🚨 **Error Handling & Recovery**

### **Network Issues**
- **Connection Failures**: Automatic retry with exponential backoff
- **API Unavailable**: Store data locally, sync when available
- **Timeout Handling**: Configurable timeout values
- **Offline Mode**: Continue scanning, queue data for later

### **System Issues**
- **Service Crashes**: Automatic restart with Windows service recovery
- **Permission Issues**: Log errors, continue with available metrics
- **Resource Shortages**: Reduce scan frequency during high usage
- **Configuration Errors**: Fall back to default settings

---

## 📊 **Performance Requirements**

### **Resource Usage**
- **CPU**: <5% average usage during scanning
- **Memory**: <50MB RAM usage
- **Disk**: <100MB storage for logs and configuration
- **Network**: <1MB/hour for typical health data

### **Scan Performance**
- **Scan Duration**: <2 seconds per scan
- **Scan Frequency**: Every 5 minutes (configurable)
- **Data Size**: <10KB per health report
- **Transmission**: <1 second to API

---

## 🔒 **Security & Privacy**

### **Data Protection**
- **Local Storage**: Encrypted configuration and logs
- **API Communication**: HTTPS with certificate validation
- **Authentication**: Device-specific API keys
- **Data Minimization**: Only collect necessary health metrics

### **Privacy Compliance**
- **No Personal Data**: No user files or personal information
- **System Only**: Only system health and performance data
- **Configurable**: Organizations can customize data collection
- **Audit Trail**: All data collection logged for compliance

---

## 🧪 **Testing Strategy**

### **Development Testing**
- **Unit Tests**: Individual component testing
- **Integration Tests**: API communication testing
- **Performance Tests**: Resource usage validation
- **Error Tests**: Failure scenario testing

### **Deployment Testing**
- **Clean Installation**: Fresh system installation
- **Upgrade Testing**: Version upgrade scenarios
- **Uninstall Testing**: Complete removal testing
- **Multi-Environment**: Different Windows versions

---

## 📅 **Implementation Timeline**

### **Week 1: Core Service**
- [ ] Convert to Windows Service
- [ ] Implement health scanning
- [ ] Create configuration management
- [ ] Basic API communication

### **Week 2: Data Collection**
- [ ] System metrics collection
- [ ] Application health monitoring
- [ ] Data validation and formatting
- [ ] Error handling and logging

### **Week 3: Deployment**
- [ ] MSI package creation
- [ ] Installation testing
- [ ] Configuration management
- [ ] Service monitoring

### **Week 4: Testing & Polish**
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Deployment preparation

---

## 🎯 **Success Criteria**

### **Functional Requirements**
- ✅ **Background Operation**: Runs as Windows service
- ✅ **Health Scanning**: Collects system metrics every 5 minutes
- ✅ **API Communication**: Sends data to GridHealth API
- ✅ **Organization Binding**: Correctly identifies organization

### **Performance Requirements**
- ✅ **Resource Usage**: <5% CPU, <50MB RAM
- ✅ **Scan Performance**: <2 seconds per scan
- ✅ **Reliability**: 99.9% uptime
- ✅ **Deployment**: <5 minute installation

---

## 💡 **Next Steps**

### **Immediate Actions**
1. **Convert to Windows Service** architecture
2. **Implement basic health scanning** functionality
3. **Create configuration management** system
4. **Set up API communication** with GridHealth server

### **This Week**
1. **Build Windows Service** foundation
2. **Implement health metrics** collection
3. **Create configuration** file management
4. **Test basic functionality**

---

## 📚 **Technical Dependencies**

### **Required Libraries**
- **Microsoft.Extensions.Hosting**: Service hosting
- **System.Management**: WMI queries for system info
- **System.Diagnostics.PerformanceCounter**: Performance metrics
- **Newtonsoft.Json**: JSON serialization
- **Microsoft.Extensions.Http**: HTTP client

### **Windows Requirements**
- **.NET 8 Runtime**: Windows 10/11 support
- **Administrator Rights**: Service installation
- **Windows Service**: Background operation
- **Event Log**: System logging

---

*Last Updated: $(date)*
*Status: 🚀 SPECIFICATION COMPLETE - READY FOR IMPLEMENTATION* 