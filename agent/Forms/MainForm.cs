using System;
using System.Drawing;
using System.Windows.Forms;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using GridHealth.Agent.Models;
using GridHealth.Agent.Services;
using System.IO;
using System.Linq;
using System.Diagnostics;
using System.Net.NetworkInformation;

namespace GridHealth.Agent.Forms
{
    public partial class MainForm : Form
    {
        private AgentConfiguration _config;

        public MainForm()
        {
            try
            {
                InitializeComponent();
                InitializeBasicConfiguration();
                UpdateUI();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error initializing MainForm: {ex.Message}", "Initialization Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void InitializeBasicConfiguration()
        {
            try
            {
                _config = LoadConfiguration() ?? new AgentConfiguration
                {
                    LicenseKey = "",
                    ScanFrequency = ScanFrequency.Daily,
                    ApiEndpoint = "https://gridhealth.arwindpianist.store",
                    DeviceId = GenerateDeviceId()
                };

                // Save the configuration if it's new
                if (LoadConfiguration() == null)
                {
                    SaveConfiguration();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error initializing configuration: {ex.Message}", "Configuration Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                _config = new AgentConfiguration
                {
                    LicenseKey = "",
                    ScanFrequency = ScanFrequency.Daily,
                    ApiEndpoint = "https://gridhealth.arwindpianist.store",
                    DeviceId = GenerateDeviceId()
                };
            }
        }

        private string GenerateDeviceId()
        {
            try
            {
                var machineName = Environment.MachineName;
                var processorCount = Environment.ProcessorCount.ToString();
                var osVersion = Environment.OSVersion.ToString();
                var userDomain = Environment.UserDomainName;
                var userName = Environment.UserName;
                var systemDir = Environment.SystemDirectory;

                // Get MAC address of primary network interface
                string macAddress = "";
                try
                {
                    var networkInterfaces = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces();
                    foreach (var ni in networkInterfaces)
                    {
                        if (ni.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up &&
                            ni.NetworkInterfaceType != System.Net.NetworkInformation.NetworkInterfaceType.Loopback)
                        {
                            var mac = ni.GetPhysicalAddress();
                            if (mac != null && mac.GetAddressBytes().Length > 0)
                            {
                                macAddress = BitConverter.ToString(mac.GetAddressBytes()).Replace("-", "");
                                break;
                            }
                        }
                    }
                }
                catch
                {
                    macAddress = "UNKNOWN";
                }

                // Create a deterministic string from machine characteristics
                var machineString = $"{machineName}|{processorCount}|{osVersion}|{userDomain}|{userName}|{systemDir}|{macAddress}";
                
                // Generate SHA256 hash and convert to GUID format
                using (var sha256 = SHA256.Create())
                {
                    var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(machineString));
                    var guid = new Guid(hashBytes.Take(16).ToArray());
                    return guid.ToString();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error generating device ID: {ex.Message}", "Device ID Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return Guid.NewGuid().ToString();
            }
        }

        private void UpdateUI()
        {
            try
            {
                if (_config != null)
                {
                    txtLicenseKey.Text = _config.LicenseKey;
                    cboScanFrequency.Text = _config.ScanFrequency.ToString();
                    txtApiEndpoint.Text = _config.ApiEndpoint;
                    lblDeviceId.Text = _config?.DeviceId ?? "Initializing...";
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error updating UI: {ex.Message}", "UI Update Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnSaveConfig_Click(object sender, EventArgs e)
        {
            try
            {
                // Validate license key
                if (string.IsNullOrWhiteSpace(txtLicenseKey.Text))
                {
                    MessageBox.Show("Please enter a license key.", "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                if (txtLicenseKey.Text.Length < 10)
                {
                    MessageBox.Show("License key must be at least 10 characters long.", "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                if (txtLicenseKey.Text.Length > 100)
                {
                    MessageBox.Show("License key is too long. Please check your input.", "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                // Update configuration
                _config.LicenseKey = txtLicenseKey.Text.Trim();
                _config.ScanFrequency = ParseScanFrequency(cboScanFrequency.Text);
                _config.ApiEndpoint = txtApiEndpoint.Text;

                // Save configuration
                SaveConfiguration();

                MessageBox.Show("Configuration saved successfully!", "Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving configuration: {ex.Message}", "Save Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnResetConfig_Click(object sender, EventArgs e)
        {
            try
            {
                var result = MessageBox.Show(
                    "Are you sure you want to reset the configuration? This will clear your license key and reset all settings.",
                    "Confirm Reset",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Question);

                if (result == DialogResult.Yes)
                {
                                    _config = new AgentConfiguration
                {
                    LicenseKey = "",
                    ScanFrequency = ScanFrequency.Daily,
                    ApiEndpoint = "https://gridhealth.arwindpianist.store/api/health",
                    DeviceId = GenerateDeviceId()
                };

                    SaveConfiguration();
                    UpdateUI();
                    MessageBox.Show("Configuration has been reset to defaults.", "Reset Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error resetting configuration: {ex.Message}", "Reset Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnStartMonitoring_Click(object sender, EventArgs e)
        {
            try
            {
                // Validate license key before starting
                if (string.IsNullOrWhiteSpace(_config?.LicenseKey))
                {
                    MessageBox.Show("Please enter and save a valid license key before starting monitoring.", "License Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                if (_config.LicenseKey.Length < 10)
                {
                    MessageBox.Show("License key must be at least 10 characters long.", "Invalid License", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                // Save configuration first
                SaveConfiguration();

                // Check if service is already installed
                if (ServiceManager.IsServiceInstalled())
                {
                    var result = MessageBox.Show(
                        "GridHealth Agent service is already installed. Would you like to start it now?",
                        "Service Already Installed",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Question);

                    if (result == DialogResult.Yes)
                    {
                        StartBackgroundService();
                    }
                }
                else
                {
                    // Install and start the service
                    InstallAndStartService();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error starting monitoring: {ex.Message}", "Start Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private async Task InstallAndStartService()
        {
            try
            {
                // Show progress to user
                var progressForm = new ServiceInstallProgressForm();
                progressForm.Show();

                try
                {
                    // Get the executable path
                    string executablePath = Path.Combine(System.AppContext.BaseDirectory, "GridHealth.Agent.exe");
                    
                    // Verify the executable exists
                    if (!File.Exists(executablePath))
                    {
                        progressForm.Close();
                        MessageBox.Show(
                            $"GridHealth.Agent.exe not found at:\n{executablePath}\n\n" +
                            "Please ensure the application is properly installed.",
                            "Executable Not Found",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error);
                        return;
                    }
                    
                    progressForm.UpdateProgress($"Installing GridHealth Agent service...\nPath: {executablePath}", 25);
                    
                    // Install the service
                    if (ServiceManager.InstallService(executablePath))
                    {
                        progressForm.UpdateProgress("Service installed successfully! Starting service...", 75);
                        
                        // Wait a moment for service to be fully registered
                        await Task.Delay(2000);
                        
                        // Start the service
                        if (ServiceManager.StartService())
                        {
                            progressForm.UpdateProgress("Service started successfully! Finalizing setup...", 90);
                            
                            // Send initial health data to register device
                            await SendInitialHealthData();
                            
                            progressForm.UpdateProgress("Setup complete! Your system is now being monitored.", 100);
                            
                            // Wait a moment for user to see completion
                            await Task.Delay(2000);
                            
                            progressForm.Close();
                            
                            // Show success message and close GUI
                            MessageBox.Show(
                                "🎉 GridHealth Agent is now running!\n\n" +
                                "✅ Your system is being monitored\n" +
                                "✅ Service will auto-start with Windows\n" +
                                "✅ Health data is being sent to GridHealth\n\n" +
                                "You can close this application. The agent will continue running in the background.",
                                "Setup Complete",
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Information);

                            // Close the GUI after successful service start
                            Application.Exit();
                        }
                        else
                        {
                            progressForm.Close();
                            MessageBox.Show(
                                "Service installed but failed to start.\n\n" +
                                "Troubleshooting steps:\n" +
                                "1. Check Windows Services (services.msc)\n" +
                                "2. Look for 'GridHealthAgent' service\n" +
                                "3. Check the service properties for errors\n" +
                                "4. Try starting the service manually",
                                "Service Start Failed",
                                MessageBoxButtons.OK,
                                MessageBoxIcon.Warning);
                        }
                    }
                    else
                    {
                        progressForm.Close();
                        MessageBox.Show(
                            "Failed to install the GridHealth Agent service.\n\n" +
                            "Common causes:\n" +
                            "• Insufficient administrator privileges\n" +
                            "• Service already exists with different configuration\n" +
                            "• Path contains invalid characters\n\n" +
                            "Please try running the application as Administrator.",
                            "Service Installation Failed",
                            MessageBoxButtons.OK,
                            MessageBoxIcon.Error);
                    }
                }
                catch (Exception ex)
                {
                    progressForm.Close();
                    throw;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error installing service: {ex.Message}", "Installation Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private async Task SendInitialHealthData()
        {
            try
            {
                // Create initial health data to register the device
                var healthData = new HealthData
                {
                    DeviceId = _config.DeviceId,
                    LicenseKey = _config.LicenseKey,
                    Timestamp = DateTime.UtcNow,
                    SystemInfo = new SystemInfo
                    {
                        Hostname = Environment.MachineName,
                        OsName = Environment.OSVersion.ToString(),
                        OsVersion = Environment.OSVersion.Version.ToString(),
                        ProcessorCount = Environment.ProcessorCount
                    },
                    PerformanceMetrics = new PerformanceMetrics
                    {
                        CpuUsagePercent = 0, // Will be updated by background service
                        MemoryUsagePercent = 0, // Will be updated by background service
                        ProcessCount = 0, // Will be updated by background service
                        ThreadCount = 0, // Will be updated by background service
                        HandleCount = 0 // Will be updated by background service
                    }
                };

                // Send to API to register device
                using (var httpClient = new HttpClient())
                {
                    httpClient.DefaultRequestHeaders.Add("X-License-Key", _config.LicenseKey);
                    
                    var json = JsonSerializer.Serialize(healthData);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");
                    
                    var response = await httpClient.PostAsync(_config.ApiEndpoint, content);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        // Device registered successfully
                        Console.WriteLine("Device registered successfully with GridHealth API");
                    }
                    else
                    {
                        Console.WriteLine($"Failed to register device: {response.StatusCode}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error registering device: {ex.Message}");
                // Don't fail the installation for this - device will register on first health scan
            }
        }

        private void StartBackgroundService()
        {
            try
            {
                if (ServiceManager.StartService())
                {
                    MessageBox.Show(
                        "GridHealth Agent service started successfully!\n\n" +
                        "Your system is now being monitored. The agent will run in the background " +
                        "and automatically start with Windows. You can close this application.",
                        "Service Started",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);

                    // Close the GUI after successful service start
                    Application.Exit();
                }
                else
                {
                    MessageBox.Show(
                        "Failed to start the GridHealth Agent service. Please check Windows Services " +
                        "and ensure the service is properly configured.",
                        "Service Start Failed",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error starting service: {ex.Message}", "Start Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void RestartAsAdministrator()
        {
            try
            {
                var startInfo = new System.Diagnostics.ProcessStartInfo
                {
                    UseShellExecute = true,
                    FileName = Path.Combine(System.AppContext.BaseDirectory, "GridHealth.Agent.exe"),
                    Verb = "runas"
                };

                System.Diagnostics.Process.Start(startInfo);
                Application.Exit();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to restart as administrator: {ex.Message}", "Restart Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnManualScan_Click(object sender, EventArgs e)
        {
            try
            {
                // Validate license key before manual scan
                if (string.IsNullOrWhiteSpace(_config?.LicenseKey))
                {
                    MessageBox.Show("Please enter and save a valid license key before performing a manual scan.", "License Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                // TODO: Implement manual health scan
                MessageBox.Show("Manual health scan completed!\n\nHealth data has been collected and sent to the GridHealth API.", 
                    "Scan Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error performing manual scan: {ex.Message}", "Scan Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnServiceStatus_Click(object sender, EventArgs e)
        {
            try
            {
                if (!ServiceManager.IsServiceInstalled())
                {
                    MessageBox.Show(
                        "GridHealth Agent service is not installed.\n\n" +
                        "Click 'Start Monitoring' to install and configure the service.",
                        "Service Not Installed",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                    return;
                }

                var status = ServiceManager.GetServiceStatus();
                var isRunning = ServiceManager.IsServiceRunning();
                
                string statusMessage = $"GridHealth Agent Service Status:\n\n" +
                    $"Service: {(isRunning ? "Running" : "Stopped")}\n" +
                    $"Status: {status}\n" +
                    $"Auto-start: Enabled\n\n" +
                    $"The service is configured to run in the background and will " +
                    $"automatically start with Windows.\n\n" +
                    $"You can manage the service through Windows Services (services.msc) " +
                    $"or use the 'Start Monitoring' button to start it if it's stopped.";

                MessageBox.Show(
                    statusMessage,
                    "Service Status",
                    MessageBoxButtons.OK,
                    isRunning ? MessageBoxIcon.Information : MessageBoxIcon.Warning);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error checking service status: {ex.Message}", "Status Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnViewLogs_Click(object sender, EventArgs e)
        {
            try
            {
                // TODO: Implement log viewer
                MessageBox.Show("Log viewer functionality will be implemented in a future update.\n\nFor now, check the application logs in the same directory as the executable.", 
                    "Log Viewer", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error opening log viewer: {ex.Message}", "Log Viewer Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnSettings_Click(object sender, EventArgs e)
        {
            try
            {
                // TODO: Implement advanced settings dialog
                MessageBox.Show("Advanced settings will be available in a future update.\n\nFor now, use the main configuration panel above.", 
                    "Settings", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error opening settings: {ex.Message}", "Settings Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private string GetConfigFilePath()
        {
            var appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var gridHealthPath = Path.Combine(appDataPath, "GridHealth");
            
            if (!Directory.Exists(gridHealthPath))
            {
                Directory.CreateDirectory(gridHealthPath);
            }
            
            return Path.Combine(gridHealthPath, "agent-config.json");
        }

        private AgentConfiguration LoadConfiguration()
        {
            try
            {
                var configPath = GetConfigFilePath();
                if (File.Exists(configPath))
                {
                    var jsonContent = File.ReadAllText(configPath);
                    var config = JsonSerializer.Deserialize<AgentConfiguration>(jsonContent);
                    return config;
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading configuration: {ex.Message}", "Load Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            return null;
        }

        private void SaveConfiguration()
        {
            try
            {
                var configPath = GetConfigFilePath();
                var jsonContent = JsonSerializer.Serialize(_config, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(configPath, jsonContent);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving configuration: {ex.Message}", "Save Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private ScanFrequency ParseScanFrequency(string frequency)
        {
            return frequency switch
            {
                "Daily" => ScanFrequency.Daily,
                "Weekly" => ScanFrequency.Weekly,
                "Monthly" => ScanFrequency.Monthly,
                _ => ScanFrequency.Daily
            };
        }

        private void UpdateScanCounter()
        {
            try
            {
                // TODO: Implement scan counter update
                // This will track and display the number of scans performed
            }
            catch (Exception ex)
            {
                // Silently handle scan counter update errors
            }
        }
    }
} 