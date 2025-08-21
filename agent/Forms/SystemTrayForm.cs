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

                // Create minimal heartbeat data (just to show device is online)
                var heartbeatData = new
                {
                    device_id = _config.DeviceId,
                    license_key = _config.LicenseKey,
                    timestamp = DateTime.UtcNow,
                    heartbeat = true,
                    system_info = new
                    {
                        hostname = Environment.MachineName,
                        os_name = Environment.OSVersion.ToString()
                    }
                };

                // Send heartbeat to API
                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Add("X-License-Key", _config.LicenseKey);
                    
                    var json = System.Text.Json.JsonSerializer.Serialize(heartbeatData);
                    var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                    
                    var response = await httpClient.PostAsync(_config.ApiEndpoint, content);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        // Update status to show device is online
                        var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                        if (statusItem != null)
                        {
                            statusItem.Text = $"Status: Online - Last heartbeat: {DateTime.Now:HH:mm}";
                        }

                        // Validate license every 10 heartbeats (every 20 minutes)
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
                // Update status to show error
                var statusItem = trayMenu.Items[0] as ToolStripMenuItem;
                if (statusItem != null)
                {
                    statusItem.Text = $"Status: Network Error - {DateTime.Now:HH:mm}";
                }
                Console.WriteLine($"Heartbeat error: {ex.Message}");
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
                    var result = await _apiClient.SendHealthDataAsync(healthData);
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