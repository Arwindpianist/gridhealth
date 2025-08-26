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

namespace GridHealth.Agent.Forms
{
    public partial class SystemTrayForm : Form
    {
        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;
        private System.Windows.Forms.Timer monitoringTimer; // For health metrics
        private System.Windows.Forms.Timer heartbeatTimer; // For online status
        private AgentConfiguration _config;
        private IHealthCollectorService _healthCollector;
        private IApiClientService _apiClient;
        private bool _isMonitoring = false;

        public SystemTrayForm()
        {
            InitializeComponent();
            InitializeTrayIcon();
            LoadConfiguration();
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

            trayMenu.Items.Add(new ToolStripSeparator());

            // Start/Stop monitoring
            var monitoringItem = new ToolStripMenuItem("Start Monitoring");
            monitoringItem.Click += (s, e) => ToggleMonitoring();
            trayMenu.Items.Add(monitoringItem);

            // Open configuration
            var configItem = new ToolStripMenuItem("Configuration");
            configItem.Click += (s, e) => OpenConfiguration();
            trayMenu.Items.Add(configItem);

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

        private void LoadConfiguration()
        {
            try
            {
                // Load configuration from file
                string configPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "GridHealth",
                    "config.json"
                );

                if (File.Exists(configPath))
                {
                    try
                    {
                        string json = File.ReadAllText(configPath);
                        _config = System.Text.Json.JsonSerializer.Deserialize<AgentConfiguration>(json);
                        
                        // Only auto-start monitoring if we have a valid, complete configuration
                        if (_config?.IsConfigured == true && 
                            !string.IsNullOrEmpty(_config.LicenseKey) &&
                            !string.IsNullOrEmpty(_config.ApiEndpoint))
                        {
                            // Don't auto-start monitoring - let user choose
                            // StartMonitoring();
                        }
                        else
                        {
                            // Configuration is incomplete, show config form
                            ShowConfigurationForm();
                        }
                    }
                    catch (JsonException ex)
                    {
                        // Configuration file is corrupted, delete it and show config form
                        try
                        {
                            File.Delete(configPath);
                        }
                        catch { }
                        
                        MessageBox.Show("Configuration file was corrupted and has been reset.", "Configuration Reset", 
                            MessageBoxButtons.OK, MessageBoxIcon.Information);
                        ShowConfigurationForm();
                    }
                }
                else
                {
                    // Show configuration form if no config exists
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

        private void ShowConfigurationForm()
        {
            var configForm = new ConfigurationForm();
            if (configForm.ShowDialog() == DialogResult.OK)
            {
                _config = configForm.Configuration;
                StartMonitoring();
            }
        }

        private void OpenConfiguration()
        {
            if (_config?.IsConfigured == true)
            {
                var configForm = new ConfigurationForm(_config);
                if (configForm.ShowDialog() == DialogResult.OK)
                {
                    _config = configForm.Configuration;
                    RestartMonitoring();
                }
            }
            else
            {
                ShowConfigurationForm();
            }
        }

        private void ToggleMonitoring()
        {
            if (_isMonitoring)
            {
                StopMonitoring();
            }
            else
            {
                // StartMonitoring is now async, but we can't make this method async
                // So we'll call it without awaiting - the validation will happen in StartMonitoring
                StartMonitoring();
            }
        }

        private async void StartMonitoring()
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
                
                // Update tray menu
                var monitoringItem = trayMenu.Items[2] as ToolStripMenuItem;
                if (monitoringItem != null)
                {
                    monitoringItem.Text = "Stop Monitoring";
                }

                var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                if (statusItem != null)
                {
                    statusItem.Text = $"Status: Online - Monitoring ({_config.ScanFrequency})";
                }

                // Start heartbeat timer (every 2 minutes for online status)
                heartbeatTimer = new System.Windows.Forms.Timer
                {
                    Interval = 2 * 60 * 1000 // 2 minutes in milliseconds
                };
                heartbeatTimer.Tick += async (s, e) => await SendHeartbeat();
                heartbeatTimer.Start();

                // Start health monitoring timer (based on user preference)
                int intervalMinutes = _config.ScanFrequency switch
                {
                    ScanFrequency.Daily => 1440,      // 24 hours
                    ScanFrequency.Weekly => 10080,    // 7 days
                    ScanFrequency.Monthly => 43200,   // 30 days
                    _ => 1440
                };

                monitoringTimer = new System.Windows.Forms.Timer
                {
                    Interval = intervalMinutes * 60 * 1000 // Convert to milliseconds
                };
                monitoringTimer.Tick += async (s, e) => await PerformHealthScan();
                monitoringTimer.Start();

                // Send initial heartbeat and perform initial scan
                _ = Task.Run(async () => 
                {
                    await SendHeartbeat();
                    await PerformHealthScan();
                });

                // Show notification
                trayIcon.ShowBalloonTip(3000, "GridHealth Agent", 
                    "System monitoring started successfully!\nOnline status updates: Every 2 minutes\n" +
                    $"Health metrics: {_config.ScanFrequency}", ToolTipIcon.Info);
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
                
                // Stop both timers
                heartbeatTimer?.Stop();
                heartbeatTimer?.Dispose();
                monitoringTimer?.Stop();
                monitoringTimer?.Dispose();

                // Update tray menu
                var monitoringItem = trayMenu.Items[2] as ToolStripMenuItem;
                if (monitoringItem != null)
                {
                    monitoringItem.Text = "Start Monitoring";
                }

                var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                if (statusItem != null)
                {
                    statusItem.Text = "Status: Offline - Stopped";
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

        private void RestartMonitoring()
        {
            StopMonitoring();
            StartMonitoring();
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
                        var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                        if (statusItem != null)
                        {
                            statusItem.Text = $"Status: Connected - Heartbeat #{_heartbeatCount}";
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
                        var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                        if (statusItem != null)
                        {
                            statusItem.Text = $"Status: Connection Error - {response.StatusCode}";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error sending heartbeat: {ex.Message}");
                // Update status to show error
                var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                if (statusItem != null)
                {
                    statusItem.Text = $"Status: Error - {ex.Message}";
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

                // Collect health data
                var healthData = await _healthCollector.CollectHealthDataAsync();
                if (healthData != null)
                {
                    // Send to API
                    var result = await _apiClient.SendHealthDataAsync(healthData, _config.ApiEndpoint);
                    if (result)
                    {
                        // Update status
                        var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                        if (statusItem != null)
                        {
                            statusItem.Text = $"Status: Online - Last full scan: {DateTime.Now:HH:mm}";
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but don't show to user
                Console.WriteLine($"Health scan error: {ex.Message}");
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
                string logPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "GridHealth",
                    "logs"
                );

                if (Directory.Exists(logPath))
                {
                    System.Diagnostics.Process.Start("explorer.exe", logPath);
                }
                else
                {
                    MessageBox.Show("No logs found.", "Logs", MessageBoxButtons.OK, MessageBoxIcon.Information);
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