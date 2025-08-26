using System;
using System.Drawing;
using System.Windows.Forms;
using System.Threading.Tasks;
using GridHealth.Agent.Models;
using GridHealth.Agent.Services;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Management;
using System.Collections.Generic; // Added for List
using System.Net.NetworkInformation; // Added for network interface information
using System.Net.Sockets; // Added for AddressFamily enum
using Microsoft.Extensions.Logging; // Added for logging

namespace GridHealth.Agent.Forms
{
    public partial class SystemTrayForm : Form
    {
        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;
        private System.Windows.Forms.Timer monitoringTimer; // For health metrics
        private System.Windows.Forms.Timer heartbeatTimer; // For online status
        private System.Windows.Forms.Timer frequentHealthTimer; // For frequent health scans when enabled
        private AgentConfiguration _config;
        private IHealthCollectorService _healthCollector;
        private IApiClientService _apiClient;
        private IConfigurationManager _configManager;
        private bool _isMonitoring = false;

        public SystemTrayForm()
        {
            InitializeComponent();
            
            // Initialize services
            _configManager = new ConfigurationManager(new LoggerFactory().CreateLogger<ConfigurationManager>());
            _healthCollector = new HealthCollectorService(new LoggerFactory().CreateLogger<HealthCollectorService>(), _configManager);
            _apiClient = new ApiClientService(new LoggerFactory().CreateLogger<ApiClientService>());
            
            // Load configuration
            LoadConfiguration();
            
            // Initialize tray icon
            InitializeTrayIcon();
            
            // Start monitoring if configured
            if (_config?.IsConfigured == true)
            {
                _ = StartMonitoring(); // Fire and forget for constructor
            }
        }

        private void InitializeComponent()
        {
            this.SuspendLayout();

            // Form properties
            this.Text = "GridHealth Agent";
            this.Size = new Size(1, 1);
            this.StartPosition = FormStartPosition.Manual;
            this.ShowInTaskbar = false;
            this.WindowState = FormWindowState.Minimized;
            this.FormBorderStyle = FormBorderStyle.FixedToolWindow;

            this.ResumeLayout(false);
        }

        private void InitializeTrayIcon()
        {
            // Create tray icon
            trayIcon = new NotifyIcon
            {
                Icon = GetApplicationIcon(),
                Text = "GridHealth Agent - System Health Monitoring",
                Visible = true
            };

            // Create context menu
            trayMenu = new ContextMenuStrip();
            
            // Status item
            var statusItem = new ToolStripMenuItem("Status: Initializing...");
            statusItem.Enabled = false;
            trayMenu.Items.Add(statusItem);

            // Health score item (will be updated after scans)
            var healthScoreItem = new ToolStripMenuItem("Health Score: --");
            healthScoreItem.Enabled = false;
            trayMenu.Items.Add(healthScoreItem);

            trayMenu.Items.Add(new ToolStripSeparator());

            // Start/Stop monitoring
            var monitoringItem = new ToolStripMenuItem("Start Monitoring");
            monitoringItem.Click += (s, e) => ToggleMonitoring();
            trayMenu.Items.Add(monitoringItem);

            // Open configuration
            var configItem = new ToolStripMenuItem("Configuration");
            configItem.Click += (s, e) => OpenConfiguration();
            trayMenu.Items.Add(configItem);

            // Manual health scan
            var scanItem = new ToolStripMenuItem("Run Health Scan Now");
            scanItem.Click += async (s, e) => await PerformHealthScan();
            trayMenu.Items.Add(scanItem);

            // View logs
            var logsItem = new ToolStripMenuItem("View Logs");
            logsItem.Click += (s, e) => ViewLogs();
            trayMenu.Items.Add(logsItem);

            trayMenu.Items.Add(new ToolStripSeparator());

            // Exit
            var exitItem = new ToolStripMenuItem("Exit");
            exitItem.Click += (s, e) => ExitApplication();
            trayMenu.Items.Add(exitItem);

            // Assign menu to tray icon
            trayIcon.ContextMenuStrip = trayMenu;

            // Double-click to open configuration
            trayIcon.DoubleClick += (s, e) => OpenConfiguration();
        }

        private Icon GetApplicationIcon()
        {
            try
            {
                string iconPath = Path.Combine(Application.StartupPath, "assets", "favicon.ico");
                if (File.Exists(iconPath))
                {
                    return new Icon(iconPath);
                }
            }
            catch
            {
                // Use default icon if custom icon fails
            }
            return SystemIcons.Application;
        }

        private async void LoadConfiguration()
        {
            try
            {
                // Load configuration using ConfigurationManager
                _config = await _configManager.LoadConfigurationAsync();
                
                if (_config?.IsConfigured == true && 
                    !string.IsNullOrEmpty(_config.LicenseKey) &&
                    !string.IsNullOrEmpty(_config.ApiEndpoint))
                {
                    // Configuration is valid, but don't auto-start monitoring
                    // StartMonitoring();
                }
                else
                {
                    // Configuration is incomplete, show config form
                    ShowConfigurationForm();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading configuration: {ex.Message}", "Configuration Error", 
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                ShowConfigurationForm();
            }
        }

        private async void ShowConfigurationForm()
        {
            var configForm = new ConfigurationForm();
            if (configForm.ShowDialog() == DialogResult.OK)
            {
                _config = configForm.Configuration;
                
                // Save configuration
                await _configManager.SaveConfigurationAsync(_config);
                
                _ = StartMonitoring(); // Fire and forget
            }
        }

        private async void OpenConfiguration()
        {
            if (_config?.IsConfigured == true)
            {
                var configForm = new ConfigurationForm(_config);
                if (configForm.ShowDialog() == DialogResult.OK)
                {
                    _config = configForm.Configuration;
                    
                    // Save configuration
                    await _configManager.SaveConfigurationAsync(_config);
                    
                    // Restart monitoring with new settings
                    if (_isMonitoring)
                    {
                        RestartMonitoring();
                    }
                    else
                    {
                        // If monitoring is not running, just restart the frequent health timer
                        RestartFrequentHealthTimer();
                    }
                }
            }
            else
            {
                ShowConfigurationForm();
            }
        }

        private async void ToggleMonitoring()
        {
            if (_isMonitoring)
            {
                StopMonitoring();
            }
            else
            {
                // StartMonitoring is now async
                await StartMonitoring();
            }
        }

        private async Task StartMonitoring()
        {
            if (_config?.IsConfigured != true)
            {
                MessageBox.Show("Please configure the agent first.", "Configuration Required", 
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
                OpenConfiguration();
                return;
            }

            // Validate license before starting monitoring
            try
            {
                var licenseService = new LicenseValidationService();
                var validationResult = await licenseService.ValidateLicenseAsync(
                    _config.LicenseKey, 
                    _config.ApiEndpoint
                );

                if (!validationResult.IsValid)
                {
                    MessageBox.Show($"License validation failed: {validationResult.Message}\n\nPlease reconfigure the agent with a valid license key.", 
                        "Invalid License", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    OpenConfiguration();
                    return;
                }

                // Update configuration with latest license info
                _config.OrganizationName = validationResult.OrganizationName;
                _config.DeviceLimit = validationResult.DeviceLimit;
                _config.LicenseType = validationResult.LicenseType;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error validating license: {ex.Message}\n\nPlease check your internet connection and try again.", 
                    "License Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            try
            {
                _isMonitoring = true;

                // Calculate monitoring interval based on scan frequency
                int intervalMinutes = _config.ScanFrequency switch
                {
                    ScanFrequency.Hourly => 60,        // 1 hour
                    ScanFrequency.Daily => 1440,       // 24 hours
                    ScanFrequency.Weekly => 10080,     // 7 days
                    ScanFrequency.Monthly => 43200,    // 30 days
                    _ => 1440
                };

                monitoringTimer = new System.Windows.Forms.Timer
                {
                    Interval = intervalMinutes * 60 * 1000 // Convert to milliseconds
                };
                monitoringTimer.Tick += async (s, e) => await PerformHealthScan();
                monitoringTimer.Start();

                // Start heartbeat timer (every 2 minutes for online status)
                heartbeatTimer = new System.Windows.Forms.Timer
                {
                    Interval = 2 * 60 * 1000 // 2 minutes
                };
                heartbeatTimer.Tick += async (s, e) => await SendHeartbeat();
                heartbeatTimer.Start();

                // Start frequent health timer if enabled (every 5 minutes)
                // Temporarily force enable frequent health scans for debugging
                bool forceEnableFrequentScans = true; // _config.EnableFrequentHealthScans;
                if (forceEnableFrequentScans)
                {
                    frequentHealthTimer = new System.Windows.Forms.Timer
                    {
                        Interval = 5 * 60 * 1000 // 5 minutes
                    };
                    frequentHealthTimer.Tick += async (s, e) => await PerformHealthScan();
                    frequentHealthTimer.Start();
                }

                // Update status to show monitoring started
                var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                if (statusItem != null)
                {
                    statusItem.Text = "Status: Starting monitoring...";
                }

                // Send initial heartbeat and perform initial scan
                _ = Task.Run(async () => 
                {
                    await SendHeartbeat();
                    // Always perform a full health scan on startup
                    await PerformHealthScan();
                });

                // Show notification
                var frequentScanInfo = _config.EnableFrequentHealthScans ? "Every 5 minutes" : "Disabled";
                var scanFrequencyInfo = _config.ScanFrequency switch
                {
                    ScanFrequency.Hourly => "Every hour",
                    ScanFrequency.Daily => "Daily",
                    ScanFrequency.Weekly => "Weekly",
                    ScanFrequency.Monthly => "Monthly",
                    _ => "Daily"
                };
                trayIcon.ShowBalloonTip(3000, "GridHealth Agent", 
                    "System monitoring started successfully!\nOnline status updates: Every 2 minutes\n" +
                    $"Health metrics: {scanFrequencyInfo}\n" +
                    $"Frequent health scans: {frequentScanInfo}", ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error starting monitoring: {ex.Message}", "Monitoring Error", 
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                _isMonitoring = false;
            }
        }

        private void StopMonitoring()
        {
            try
            {
                _isMonitoring = false;
                
                // Stop all timers
                heartbeatTimer?.Stop();
                heartbeatTimer?.Dispose();
                monitoringTimer?.Stop();
                monitoringTimer?.Dispose();
                frequentHealthTimer?.Stop();
                frequentHealthTimer?.Dispose();

                // Update tray menu
                var monitoringItem = trayMenu.Items[3] as ToolStripMenuItem; // Updated index due to health score item
                if (monitoringItem != null)
                {
                    monitoringItem.Text = "Start Monitoring";
                }

                var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                if (statusItem != null)
                {
                    statusItem.Text = "Status: Offline - Stopped";
                }

                var healthScoreItem = trayMenu.Items[1] as ToolStripMenuItem;
                if (healthScoreItem != null)
                {
                    healthScoreItem.Text = "Health Score: --";
                    healthScoreItem.Enabled = false;
                }

                trayIcon.ShowBalloonTip(3000, "GridHealth Agent", 
                    "System monitoring stopped. Device will appear offline.", ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error stopping monitoring: {ex.Message}", "Monitoring Error", 
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private async void RestartMonitoring()
        {
            StopMonitoring();
            await StartMonitoring();
        }

        private void RestartFrequentHealthTimer()
        {
            // Stop existing frequent health timer
            frequentHealthTimer?.Stop();
            frequentHealthTimer?.Dispose();

            // Start new frequent health timer if enabled
            // Temporarily force enable frequent health scans for debugging
            bool forceEnableFrequentScans = true; // _isMonitoring && _config.EnableFrequentHealthScans;
            if (forceEnableFrequentScans)
            {
                frequentHealthTimer = new System.Windows.Forms.Timer
                {
                    Interval = 5 * 60 * 1000 // 5 minutes
                };
                frequentHealthTimer.Tick += async (s, e) => await PerformHealthScan();
                frequentHealthTimer.Start();
            }
        }

        private int _heartbeatCount = 0;
        
        private async Task SendHeartbeat()
        {
            try
            {
                if (!_isMonitoring) return;

                _heartbeatCount++;

                // Get or generate a consistent device ID
                var deviceId = _config.DeviceId ?? GetStableDeviceId(); // Use stable device ID

                // Collect comprehensive system information for heartbeat
                var systemInfo = GetComprehensiveSystemInfo();

                var heartbeatData = new
                {
                    device_id = deviceId, // Use the stable device ID
                    license_key = _config.LicenseKey,
                    timestamp = DateTime.UtcNow,
                    type = "heartbeat",
                    status = "online",
                    system_info = systemInfo,
                    network_health = GetNetworkHealthInfo()
                };

                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Add("X-License-Key", _config.LicenseKey);
                    
                    var json = System.Text.Json.JsonSerializer.Serialize(heartbeatData);
                    var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                    
                    // Use the correct health API endpoint
                    var healthEndpoint = $"{_config.ApiEndpoint.TrimEnd('/')}/api/health"; // Corrected endpoint
                    var response = await httpClient.PostAsync(healthEndpoint, content);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        // Update status to show successful connection
                        var heartbeatSuccessStatusItem = trayMenu.Items[0] as ToolStripMenuItem;
                        if (heartbeatSuccessStatusItem != null)
                        {
                            heartbeatSuccessStatusItem.Text = $"Status: Online - Heartbeat #{_heartbeatCount}";
                        }

                        // Periodically validate license (every 10 heartbeats)
                        if (_heartbeatCount % 10 == 0)
                        {
                            await ValidateLicensePeriodically();
                        }
                    }
                    else
                    {
                        // Update status to show connection issues
                        var connectionStatusItem = trayMenu.Items[0] as ToolStripMenuItem;
                        if (connectionStatusItem != null)
                        {
                            connectionStatusItem.Text = $"Status: Connection Error - {response.StatusCode}";
                        }

                        // Reset health score item
                        var connectionHealthScoreItem = trayMenu.Items[1] as ToolStripMenuItem;
                        if (connectionHealthScoreItem != null)
                        {
                            connectionHealthScoreItem.Text = "Health Score: --";
                            connectionHealthScoreItem.Enabled = false;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error sending heartbeat: {ex.Message}");
                // Update status to show error
                var heartbeatErrorStatusItem = trayMenu.Items[0] as ToolStripMenuItem;
                if (heartbeatErrorStatusItem != null)
                {
                    heartbeatErrorStatusItem.Text = $"Status: Error - {ex.Message}";
                }

                // Reset health score item
                var heartbeatErrorHealthScoreItem = trayMenu.Items[1] as ToolStripMenuItem;
                if (heartbeatErrorHealthScoreItem != null)
                {
                    heartbeatErrorHealthScoreItem.Text = "Health Score: --";
                    heartbeatErrorHealthScoreItem.Enabled = false;
                }
            }
        }

        private async Task ValidateLicensePeriodically()
        {
            try
            {
                var licenseService = new LicenseValidationService();
                var validationResult = await licenseService.ValidateLicenseAsync(
                    _config.LicenseKey, 
                    _config.ApiEndpoint
                );

                if (!validationResult.IsValid)
                {
                    // License is no longer valid - stop monitoring
                    MessageBox.Show($"License validation failed: {validationResult.Message}\n\nMonitoring has been stopped. Please reconfigure the agent with a valid license key.", 
                        "License Expired", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    StopMonitoring();
                    OpenConfiguration();
                }
            }
            catch (Exception ex)
            {
                // Log error but don't stop monitoring for network issues
                Console.WriteLine($"Periodic license validation error: {ex.Message}");
            }
        }

        private async Task PerformHealthScan()
        {
            try
            {
                if (!_isMonitoring) return;

                // Update status to show scan in progress
                var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                if (statusItem != null)
                {
                    statusItem.Text = "Status: Running Health Scan...";
                }

                // Update monitoring item text
                var monitoringItem = trayMenu.Items[3] as ToolStripMenuItem; // Updated index due to health score item
                if (monitoringItem != null)
                {
                    monitoringItem.Text = "Stop Monitoring";
                }

                // Collect comprehensive health data including calculated health score
                var healthData = await _healthCollector.CollectHealthDataAsync();
                if (healthData != null)
                {
                    // Debug logging to see what we got
                    Console.WriteLine($"🔍 Health data collected: {healthData != null}");
                    Console.WriteLine($"🔍 Health score: {healthData.HealthScore != null}");
                    if (healthData.HealthScore != null)
                    {
                        Console.WriteLine($"🔍 Overall score: {healthData.HealthScore.Overall}");
                        Console.WriteLine($"🔍 Performance: {healthData.HealthScore.Performance}");
                        Console.WriteLine($"🔍 Disk: {healthData.HealthScore.Disk}");
                        Console.WriteLine($"🔍 Memory: {healthData.HealthScore.Memory}");
                        Console.WriteLine($"🔍 Network: {healthData.HealthScore.Network}");
                        Console.WriteLine($"🔍 Services: {healthData.HealthScore.Services}");
                        Console.WriteLine($"🔍 Security: {healthData.HealthScore.Security}");
                    }
                    else
                    {
                        Console.WriteLine("❌ Health score is null!");
                    }

                    // Log health score information
                    if (healthData.HealthScore != null)
                    {
                        Console.WriteLine($"✅ Health scan completed - Overall Score: {healthData.HealthScore.Overall}/100 " +
                            $"(Performance: {healthData.HealthScore.Performance}, Disk: {healthData.HealthScore.Disk}, " +
                            $"Memory: {healthData.HealthScore.Memory}, Network: {healthData.HealthScore.Network}, " +
                            $"Services: {healthData.HealthScore.Services}, Security: {healthData.HealthScore.Security})");
                    }

                    // Send to API
                    var result = await _apiClient.SendHealthDataAsync(healthData, _config.ApiEndpoint);
                    if (result)
                    {
                        // Update status with health score
                        var successStatusItem = trayMenu.Items[0] as ToolStripMenuItem;
                        var successHealthScoreItem = trayMenu.Items[1] as ToolStripMenuItem;
                        
                        if (successStatusItem != null)
                        {
                            successStatusItem.Text = $"Status: Online - Last scan: {DateTime.Now:HH:mm}";
                        }
                        
                        if (successHealthScoreItem != null)
                        {
                            var healthScore = healthData.HealthScore?.Overall ?? 0;
                            var healthStatus = healthScore >= 80 ? "🟢" : healthScore >= 60 ? "🟡" : "🔴";
                            successHealthScoreItem.Text = $"Health Score: {healthStatus} {healthScore}/100";
                            successHealthScoreItem.Enabled = true;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Health scan error: {ex.Message}");
                // Update status to show error
                var errorStatusItem = trayMenu.Items[0] as ToolStripMenuItem;
                if (errorStatusItem != null)
                {
                    errorStatusItem.Text = $"Status: Scan Error - {ex.Message}";
                }

                // Reset health score item
                var errorHealthScoreItem = trayMenu.Items[1] as ToolStripMenuItem;
                if (errorHealthScoreItem != null)
                {
                    errorHealthScoreItem.Text = "Health Score: --";
                    errorHealthScoreItem.Enabled = false;
                }
            }
        }

        // Added GetStableDeviceId method
        private string GetStableDeviceId()
        {
            try
            {
                // First try to get the UUID from WMI (most stable)
                using var searcher = new ManagementObjectSearcher("SELECT UUID FROM Win32_ComputerSystemProduct");
                foreach (ManagementObject obj in searcher.Get())
                {
                    var uuid = obj["UUID"]?.ToString();
                    if (!string.IsNullOrEmpty(uuid) && uuid != "00000000-0000-0000-0000-000000000000")
                    {
                        return uuid;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Warning: Could not get device UUID from WMI: {ex.Message}");
            }

            try
            {
                // Fallback: Try to get Serial Number from BIOS
                using var searcher = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BIOS");
                foreach (ManagementObject obj in searcher.Get())
                {
                    var serial = obj["SerialNumber"]?.ToString();
                    if (!string.IsNullOrEmpty(serial) && serial != "0" && serial != "To be filled by O.E.M.")
                    {
                        return $"BIOS-{serial}";
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Warning: Could not get BIOS serial number: {ex.Message}");
            }

            try
            {
                // Fallback: Try to get MAC address of primary network adapter
                var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces();
                foreach (var ni in networkInterfaces)
                {
                    if (ni.OperationalStatus == OperationalStatus.Up &&
                        ni.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                    {
                        var macAddress = ni.GetPhysicalAddress().ToString();
                        if (!string.IsNullOrEmpty(macAddress))
                        {
                            return $"MAC-{macAddress}";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Warning: Could not get MAC address: {ex.Message}");
            }

            // Final fallback: Use machine name (less stable but better than random)
            var machineName = Environment.MachineName;
            if (!string.IsNullOrEmpty(machineName))
            {
                return $"HOST-{machineName}";
            }

            // Last resort: Generate a stable ID based on machine name hash
            return $"HASH-{Math.Abs(machineName.GetHashCode()):X8}";
        }

        // Helper method to get comprehensive system information
        private object GetComprehensiveSystemInfo()
        {
            try
            {
                var osInfo = Environment.OSVersion;
                var machineName = Environment.MachineName;
                var processorCount = Environment.ProcessorCount;
                var workingSet = Environment.WorkingSet;
                var systemPageSize = Environment.SystemPageSize;

                // Get more detailed OS information from WMI
                string osName = "Windows";
                string osVersion = osInfo.Version.ToString();
                string osDescription = "";

                try
                {
                    using var searcher = new ManagementObjectSearcher("SELECT Caption, Version FROM Win32_OperatingSystem");
                    foreach (ManagementObject obj in searcher.Get())
                    {
                        osName = obj["Caption"]?.ToString() ?? "Windows";
                        osVersion = obj["Version"]?.ToString() ?? osInfo.Version.ToString();
                        osDescription = obj["Caption"]?.ToString() ?? "";
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Warning: Could not get detailed OS info from WMI: {ex.Message}");
                }

                return new
                {
                    hostname = machineName,
                    machine_name = machineName,
                    os_name = osName,
                    os_version = osVersion,
                    os_description = osDescription,
                    os_platform = osInfo.Platform.ToString(),
                    processor_count = processorCount,
                    working_set_mb = workingSet / (1024 * 1024),
                    system_page_size = systemPageSize,
                    user_domain_name = Environment.UserDomainName,
                    user_name = Environment.UserName
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Warning: Could not get comprehensive system info: {ex.Message}");
                // Fallback to basic info
                return new
                {
                    hostname = Environment.MachineName,
                    machine_name = Environment.MachineName,
                    os_name = "Windows",
                    os_version = Environment.OSVersion.Version.ToString()
                };
            }
        }

        // Helper method to get network health information
        private object GetNetworkHealthInfo()
        {
            try
            {
                var networkInterfaces = NetworkInterface.GetAllNetworkInterfaces();
                var interfaces = new List<object>();

                foreach (var ni in networkInterfaces)
                {
                    if (ni.OperationalStatus == OperationalStatus.Up &&
                        ni.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                    {
                        var properties = ni.GetIPProperties();
                        var ipAddresses = new List<string>();
                        var macAddress = ni.GetPhysicalAddress().ToString();

                        foreach (var addr in properties.UnicastAddresses)
                        {
                            if (addr.Address.AddressFamily == AddressFamily.InterNetwork) // IPv4 only
                            {
                                ipAddresses.Add(addr.Address.ToString());
                            }
                        }

                        interfaces.Add(new
                        {
                            name = ni.Name,
                            description = ni.Description,
                            type = ni.NetworkInterfaceType.ToString(),
                            speed = ni.Speed,
                            mac_address = macAddress,
                            ip_addresses = ipAddresses,
                            operational_status = ni.OperationalStatus.ToString(),
                            is_up = ni.OperationalStatus == OperationalStatus.Up
                        });
                    }
                }

                return new
                {
                    network_interfaces = interfaces,
                    total_interfaces = networkInterfaces.Length,
                    active_interfaces = interfaces.Count
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Warning: Could not get network health info: {ex.Message}");
                return new
                {
                    network_interfaces = new List<object>(),
                    total_interfaces = 0,
                    active_interfaces = 0
                };
            }
        }

        private void ViewLogs()
        {
            try
            {
                // Try multiple possible log locations
                var possibleLogPaths = new List<string>
                {
                    // Current directory logs
                    Path.Combine(Application.StartupPath, "logs"),
                    // AppData logs
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "GridHealth", "logs"),
                    // Working directory logs
                    Path.Combine(Directory.GetCurrentDirectory(), "logs"),
                    // Console output file (if redirected)
                    Path.Combine(Application.StartupPath, "output.log")
                };

                string logPath = null;
                foreach (var path in possibleLogPaths)
                {
                    if (Directory.Exists(path) || File.Exists(path))
                    {
                        logPath = path;
                        break;
                    }
                }

                if (logPath != null)
                {
                    if (Directory.Exists(logPath))
                    {
                        System.Diagnostics.Process.Start("explorer.exe", logPath);
                    }
                    else if (File.Exists(logPath))
                    {
                        // Open the log file with default text editor
                        System.Diagnostics.Process.Start("notepad.exe", logPath);
                    }
                }
                else
                {
                    // Show current console output if available
                    var message = "No log files found in expected locations.\n\n" +
                                "Expected locations:\n" +
                                string.Join("\n", possibleLogPaths.Select(p => $"• {p}")) +
                                "\n\nConsole output should be visible if running from command line.";
                    
                    MessageBox.Show(message, "Logs", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error opening logs: {ex.Message}", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void ExitApplication()
        {
            try
            {
                StopMonitoring();
                trayIcon.Visible = false;
                trayIcon.Dispose();
                Application.Exit();
            }
            catch
            {
                // Force exit if cleanup fails
                Environment.Exit(0);
            }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                this.WindowState = FormWindowState.Minimized;
                this.ShowInTaskbar = false;
            }
            else
            {
                ExitApplication();
            }
        }
    }
} 