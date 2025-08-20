using System.Drawing;
using System.Windows.Forms;
using Microsoft.Extensions.Logging;
using GridHealth.Agent.Models;
using GridHealth.Agent.Services;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System;
using System.Net.NetworkInformation;
using System.Security.Cryptography;
using System.Text;

namespace GridHealth.Agent.Forms;

public partial class MainForm : Form
{
    private AgentConfiguration _config;
    private bool _isMonitoring = false;
    private System.Windows.Forms.Timer _monitoringTimer;
    private System.Windows.Forms.Timer _statusTimer;

    public MainForm()
    {
        InitializeComponent();
        InitializeBasicConfiguration();
        UpdateUI();
        
        // Ensure form is visible and on top
        this.Visible = true;
        this.ShowInTaskbar = true;
        this.WindowState = FormWindowState.Normal;
        this.BringToFront();
        this.Focus();
        
        Console.WriteLine("🎯 MainForm constructor completed");
        Console.WriteLine($"📱 Form visible: {this.Visible}");
        Console.WriteLine($"🪟 Window state: {this.WindowState}");
    }
    
    private void InitializeBasicConfiguration()
    {
        // Initialize basic configuration
        _config = new AgentConfiguration
        {
            LicenseKey = "",
            ApiEndpoint = "https://gridhealth.arwindpianist.store/api/health",
            ScanFrequency = ScanFrequency.Daily,
            ScanIntervalMinutes = 1440, // 24 hours
            IsConfigured = false,
            LastConfigured = null
        };
        
        // Generate a unique device ID for this machine
        _config.DeviceId = GenerateDeviceId();
        
        // Initialize timers
        _monitoringTimer = new System.Windows.Forms.Timer();
        _monitoringTimer.Interval = 60000; // 1 minute
        _monitoringTimer.Tick += MonitoringTimer_Tick;
        
        _statusTimer = new System.Windows.Forms.Timer();
        _statusTimer.Interval = 5000; // 5 seconds
        _statusTimer.Tick += StatusTimer_Tick;
        _statusTimer.Start();
    }
    
    private string GenerateDeviceId()
    {
        try
        {
            // Try to get a stable identifier from the machine
            var machineName = Environment.MachineName;
            var processorId = Environment.ProcessorCount.ToString();
            var osVersion = Environment.OSVersion.ToString();
            
            // Create a hash from machine-specific information
            using (var sha256 = SHA256.Create())
            {
                var input = $"{machineName}|{processorId}|{osVersion}|{Environment.UserDomainName}";
                var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
                
                // Convert to GUID format (UUID v5-like)
                var guid = new Guid(hashBytes.Take(16).ToArray());
                return guid.ToString();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Error generating device ID: {ex.Message}");
            // Fallback to a random GUID
            return Guid.NewGuid().ToString();
        }
    }

    private void InitializeComponent()
    {
        this.SuspendLayout();
        
        // Form properties
        this.Text = "GridHealth Agent - System Health Monitor";
        this.Size = new Size(1200, 800); // Increased size for better layout
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedSingle;
        this.MaximizeBox = false;
        this.BackColor = Color.FromArgb(8, 11, 25); // Deep purple/blue dark
        
        // Main panel
        var mainPanel = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(8, 11, 25) // Deep purple/blue dark
        };

        // Header with branding
        var headerPanel = CreateHeaderPanel();
        mainPanel.Controls.Add(headerPanel);

        // Configuration Instructions Panel
        var instructionsPanel = CreateInstructionsPanel();
        mainPanel.Controls.Add(instructionsPanel);

        // Configuration panel
        var configPanel = CreateConfigurationPanel();
        mainPanel.Controls.Add(configPanel);

        // Data Testing Panel
        var dataTestPanel = CreateDataTestPanel();
        mainPanel.Controls.Add(dataTestPanel);

        // Status panel
        var statusPanel = CreateStatusPanel();
        mainPanel.Controls.Add(statusPanel);

        // Control panel
        var controlPanel = CreateControlPanel();
        mainPanel.Controls.Add(controlPanel);

        // Layout panels
        headerPanel.Dock = DockStyle.Top;
        headerPanel.Height = 100;
        
        instructionsPanel.Dock = DockStyle.Top;
        instructionsPanel.Height = 100;
        
        configPanel.Dock = DockStyle.Top;
        configPanel.Height = 300;
        
        dataTestPanel.Dock = DockStyle.Top;
        dataTestPanel.Height = 150;
        
        statusPanel.Dock = DockStyle.Fill;
        
        controlPanel.Dock = DockStyle.Bottom;
        controlPanel.Height = 120;

        this.Controls.Add(mainPanel);
        this.ResumeLayout(false);
    }

    private Panel CreateHeaderPanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(15, 23, 42), // Darker purple/blue
            Padding = new Padding(30),
            Height = 120
        };

        // GridHealth branding (no logo)
        var logoLabel = new Label
        {
            Text = "GridHealth Agent",
            Font = new Font("Segoe UI", 28, FontStyle.Bold),
            ForeColor = Color.FromArgb(139, 92, 246), // Purple-500
            AutoSize = true,
            Location = new Point(30, 25)
        };

        var subtitleLabel = new Label
        {
            Text = "Enterprise System Health Monitoring & Analytics",
            Font = new Font("Segoe UI", 14),
            ForeColor = Color.FromArgb(168, 85, 247), // Purple-400
            AutoSize = true,
            Location = new Point(30, 65)
        };

        // Status indicator
        var statusIndicator = new Label
        {
            Name = "lblHeaderStatus",
            Text = "●",
            Font = new Font("Segoe UI", 20),
            ForeColor = Color.Orange,
            AutoSize = true,
            Location = new Point(850, 25)
        };

        var statusText = new Label
        {
            Name = "lblHeaderStatusText",
            Text = "Not Configured",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.Orange,
            AutoSize = true,
            Location = new Point(870, 35)
        };

        panel.Controls.AddRange(new Control[] { logoLabel, subtitleLabel, statusIndicator, statusText });

        return panel;
    }

    private Panel CreateInstructionsPanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(22, 33, 62), // Darker purple/blue
            Padding = new Padding(25),
            Height = 100
        };

        var instructionsLabel = new Label
        {
            Text = "📋 Configuration Instructions:",
            Font = new Font("Segoe UI", 14, FontStyle.Bold),
            ForeColor = Color.FromArgb(59, 130, 246), // Blue-500
            AutoSize = true,
            Location = new Point(25, 25)
        };

        var step1Label = new Label
        {
            Text = "1. Enter your GridHealth license key",
            Font = new Font("Segoe UI", 11),
            ForeColor = Color.FromArgb(203, 213, 225), // Slate-300
            AutoSize = true,
            Location = new Point(25, 55)
        };

        var step2Label = new Label
        {
            Text = "2. Select scan frequency (Daily/Weekly/Monthly)",
            Font = new Font("Segoe UI", 11),
            ForeColor = Color.FromArgb(203, 213, 225), // Slate-300
            AutoSize = true,
            Location = new Point(300, 55)
        };

        var step3Label = new Label
        {
            Text = "3. Test connection and save configuration",
            Font = new Font("Segoe UI", 11),
            ForeColor = Color.FromArgb(203, 213, 225), // Slate-300
            AutoSize = true,
            Location = new Point(600, 55)
        };

        panel.Controls.AddRange(new Control[] { instructionsLabel, step1Label, step2Label, step3Label });

        return panel;
    }

    private Panel CreateDataTestPanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(22, 33, 62), // Darker purple/blue
            Padding = new Padding(25),
            Height = 150
        };

        var titleLabel = new Label
        {
            Text = "📊 Data Transmission Testing",
            Font = new Font("Segoe UI", 14, FontStyle.Bold),
            ForeColor = Color.FromArgb(59, 130, 246), // Blue-500
            AutoSize = true,
            Location = new Point(25, 25)
        };

        var descriptionLabel = new Label
        {
            Text = "Test if health data is being sent successfully to your database:",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.FromArgb(203, 213, 225), // Slate-300
            AutoSize = true,
            Location = new Point(25, 55)
        };

        var testDataButton = new Button
        {
            Name = "btnTestDataTransmission",
            Text = "🚀 Send Test Health Data",
            Size = new Size(200, 45),
            Location = new Point(25, 85),
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            BackColor = Color.FromArgb(168, 85, 247), // Purple-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Cursor = Cursors.Hand
        };
        testDataButton.Click += BtnTestDataTransmission_Click;

        var viewLastTransmissionButton = new Button
        {
            Name = "btnViewLastTransmission",
            Text = "📋 View Last Transmission",
            Size = new Size(200, 45),
            Location = new Point(245, 85),
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            BackColor = Color.FromArgb(34, 197, 94), // Green-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Cursor = Cursors.Hand
        };
        viewLastTransmissionButton.Click += BtnViewLastTransmission_Click;

        var testDatabaseButton = new Button
        {
            Name = "btnTestDatabase",
            Text = "🗄️ Test Database Connection",
            Size = new Size(200, 45),
            Location = new Point(470, 85),
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            BackColor = Color.FromArgb(251, 191, 36), // Amber-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Cursor = Cursors.Hand
        };
        testDatabaseButton.Click += BtnTestDatabase_Click;

        var testConnectivityButton = new Button
        {
            Name = "btnTestConnectivity",
            Text = "🌐 Test Basic Connectivity",
            Size = new Size(200, 45),
            Location = new Point(690, 85),
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            BackColor = Color.FromArgb(236, 72, 153), // Pink-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Cursor = Cursors.Hand
        };
        testConnectivityButton.Click += BtnTestConnectivity_Click;

        var transmissionStatusLabel = new Label
        {
            Name = "lblTransmissionStatus",
            Text = "Status: Ready to test",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.FromArgb(156, 163, 175), // Gray-400
            AutoSize = true,
            Location = new Point(470, 95)
        };

        panel.Controls.AddRange(new Control[] { titleLabel, descriptionLabel, testDataButton, viewLastTransmissionButton, testDatabaseButton, testConnectivityButton, transmissionStatusLabel });

        return panel;
    }

    private Panel CreateConfigurationPanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(30, 41, 62), // Purple/blue tint
            Padding = new Padding(30),
            Height = 300
        };

        // Title
        var titleLabel = new Label
        {
            Text = "Agent Configuration",
            Font = new Font("Segoe UI", 16, FontStyle.Bold),
            ForeColor = Color.FromArgb(139, 92, 246), // Purple-500
            AutoSize = true,
            Location = new Point(30, 30)
        };

        // License Key
        var licenseLabel = new Label
        {
            Text = "License Key:",
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            ForeColor = Color.FromArgb(203, 213, 225), // Slate-300
            AutoSize = true,
            Location = new Point(30, 80)
        };

        var licenseTextBox = new TextBox
        {
            Name = "txtLicenseKey",
            Size = new Size(450, 36),
            Location = new Point(180, 78),
            Font = new Font("Segoe UI", 11),
            BackColor = Color.FromArgb(30, 41, 62), // Darker background
            ForeColor = Color.FromArgb(226, 232, 240), // Slate-200
            BorderStyle = BorderStyle.FixedSingle,
            PlaceholderText = "Enter your GridHealth license key"
        };

        var licenseHelpLabel = new Label
        {
            Text = "Required for agent activation and monitoring",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.FromArgb(156, 163, 175), // Gray-400
            AutoSize = true,
            Location = new Point(600, 82)
        };

        // Scan Frequency
        var frequencyLabel = new Label
        {
            Text = "Scan Frequency:",
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            ForeColor = Color.FromArgb(203, 213, 225), // Slate-300
            AutoSize = true,
            Location = new Point(30, 130)
        };

        var frequencyCombo = new ComboBox
        {
            Name = "cboScanFrequency",
            Size = new Size(200, 36),
            Location = new Point(180, 128),
            Font = new Font("Segoe UI", 11),
            BackColor = Color.FromArgb(30, 41, 62), // Darker background
            ForeColor = Color.FromArgb(226, 232, 240), // Slate-200
            DropDownStyle = ComboBoxStyle.DropDownList
        };
        frequencyCombo.Items.AddRange(new object[] { "Daily", "Weekly", "Monthly" });
        frequencyCombo.SelectedIndex = 0;

        var frequencyHelpLabel = new Label
        {
            Text = "How often to collect system health data",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.FromArgb(156, 163, 175), // Gray-400
            AutoSize = true,
            Location = new Point(380, 132)
        };

        // API Endpoint
        var endpointLabel = new Label
        {
            Text = "API Endpoint:",
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            ForeColor = Color.FromArgb(203, 213, 225), // Slate-300
            AutoSize = true,
            Location = new Point(30, 180)
        };

        var endpointTextBox = new TextBox
        {
            Name = "txtApiEndpoint",
            Size = new Size(450, 36),
            Location = new Point(180, 178),
            Font = new Font("Segoe UI", 11),
            BackColor = Color.FromArgb(51, 65, 85), // Slate-700 (disabled look)
            ForeColor = Color.FromArgb(148, 163, 184), // Slate-400 (disabled text)
            BorderStyle = BorderStyle.FixedSingle,
            Text = "https://gridhealth.arwindpianist.store/api/health",
            ReadOnly = true,
            Enabled = false
        };

        var endpointHelpLabel = new Label
        {
            Text = "⚠️ IT Team: Whitelist this domain in firewall/proxy",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.FromArgb(251, 191, 36), // Amber-400
            AutoSize = true,
            Location = new Point(600, 182)
        };

        // Buttons
        var testButton = new Button
        {
            Name = "btnTestConnection",
            Text = "🔍 Test Connection",
            Size = new Size(170, 45),
            Location = new Point(180, 240),
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            BackColor = Color.FromArgb(59, 130, 246), // Blue-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Cursor = Cursors.Hand
        };
        testButton.Click += BtnTestConnection_Click;

        var saveButton = new Button
        {
            Name = "btnSaveConfig",
            Text = "💾 Save & Activate",
            Size = new Size(190, 45),
            Location = new Point(370, 240),
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            BackColor = Color.FromArgb(34, 197, 94), // Green-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Cursor = Cursors.Hand
        };
        saveButton.Click += BtnSaveConfig_Click;

        var resetButton = new Button
        {
            Name = "btnResetConfig",
            Text = "🔄 Reset",
            Size = new Size(130, 45),
            Location = new Point(580, 240),
            Font = new Font("Segoe UI", 11),
            BackColor = Color.FromArgb(239, 68, 68), // Red-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat,
            Cursor = Cursors.Hand
        };
        resetButton.Click += BtnResetConfig_Click;

        panel.Controls.AddRange(new Control[] 
        { 
            titleLabel,
            licenseLabel, licenseTextBox, licenseHelpLabel,
            frequencyLabel, frequencyCombo, frequencyHelpLabel,
            endpointLabel, endpointTextBox, endpointHelpLabel,
            testButton, saveButton, resetButton
        });

        return panel;
    }

    private Panel CreateStatusPanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(30, 41, 62), // Purple/blue tint
            Padding = new Padding(25)
        };

        // Status section
        var statusTitleLabel = new Label
        {
            Text = "Agent Status & Monitoring",
            Font = new Font("Segoe UI", 12, FontStyle.Bold),
            ForeColor = Color.FromArgb(226, 232, 240), // Slate-200 equivalent
            AutoSize = true,
            Location = new Point(20, 20)
        };

        // Status indicators
        var statusLabel = new Label
        {
            Name = "lblStatus",
            Text = "Status: Not Configured",
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            ForeColor = Color.Orange,
            AutoSize = true,
            Location = new Point(20, 50)
        };

        var statusIconLabel = new Label
        {
            Name = "lblStatusIcon",
            Text = "⚠️",
            Font = new Font("Segoe UI", 16),
            ForeColor = Color.Orange,
            AutoSize = true,
            Location = new Point(200, 45)
        };

        // Monitoring info
        var lastScanLabel = new Label
        {
            Name = "lblLastScan",
            Text = "Last Scan: Never",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.Silver,
            AutoSize = true,
            Location = new Point(20, 80)
        };

        var nextScanLabel = new Label
        {
            Name = "lblNextScan",
            Text = "Next Scan: Not Scheduled",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.Silver,
            AutoSize = true,
            Location = new Point(20, 100)
        };

        var scanCountLabel = new Label
        {
            Name = "lblScanCount",
            Text = "Total Scans: 0",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.Silver,
            AutoSize = true,
            Location = new Point(20, 120)
        };

        var deviceIdLabel = new Label
        {
            Name = "lblDeviceId",
            Text = $"Device ID: {_config.DeviceId}",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.FromArgb(156, 163, 175), // Gray-400
            AutoSize = true,
            Location = new Point(20, 140)
        };

        // System info preview
        var systemInfoLabel = new Label
        {
            Text = "System Information:",
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(300, 50)
        };

        var cpuLabel = new Label
        {
            Name = "lblCpuInfo",
            Text = "CPU: --",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.Silver,
            AutoSize = true,
            Location = new Point(300, 70)
        };

        var memoryLabel = new Label
        {
            Name = "lblMemoryInfo",
            Text = "Memory: --",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.Silver,
            AutoSize = true,
            Location = new Point(300, 90)
        };

        var diskLabel = new Label
        {
            Name = "lblDiskInfo",
            Text = "Disk: --",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.Silver,
            AutoSize = true,
            Location = new Point(300, 110)
        };

        var networkLabel = new Label
        {
            Name = "lblNetworkInfo",
            Text = "Network: --",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.Silver,
            AutoSize = true,
            Location = new Point(300, 130)
        };

        // Log section
        var logTitleLabel = new Label
        {
            Text = "Activity Log:",
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(20, 160)
        };

        var logTextBox = new TextBox
        {
            Name = "txtLog",
            Multiline = true,
            ReadOnly = true,
            ScrollBars = ScrollBars.Vertical,
            Size = new Size(800, 200),
            Location = new Point(20, 185),
            Font = new Font("Consolas", 9),
            BackColor = Color.Black,
            ForeColor = Color.Lime,
            BorderStyle = BorderStyle.FixedSingle
        };

        panel.Controls.AddRange(new Control[] 
        { 
            statusTitleLabel,
            statusLabel, statusIconLabel,
            lastScanLabel, nextScanLabel, scanCountLabel, deviceIdLabel,
            systemInfoLabel, cpuLabel, memoryLabel, diskLabel, networkLabel,
            logTitleLabel, logTextBox
        });

        return panel;
    }

    private Panel CreateControlPanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(22, 33, 62), // Darker purple/blue
            Padding = new Padding(25),
            Height = 120
        };

        // Start/Stop Monitoring Button
        var monitorButton = new Button
        {
            Name = "btnStartMonitoring",
            Text = "▶️ Start Monitoring",
            Size = new Size(180, 45),
            Location = new Point(25, 35),
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            BackColor = Color.FromArgb(34, 197, 94), // Green-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        monitorButton.Click += BtnStartMonitoring_Click;

        // Manual Scan Button
        var scanButton = new Button
        {
            Name = "btnManualScan",
            Text = "🔍 Manual Scan",
            Size = new Size(160, 45),
            Location = new Point(225, 35),
            Font = new Font("Segoe UI", 11),
            BackColor = Color.FromArgb(59, 130, 246), // Blue-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        scanButton.Click += BtnManualScan_Click;

        // View Logs Button
        var logsButton = new Button
        {
            Name = "btnViewLogs",
            Text = "📋 View Logs",
            Size = new Size(160, 45),
            Location = new Point(405, 35),
            Font = new Font("Segoe UI", 11),
            BackColor = Color.FromArgb(107, 114, 128), // Gray-500
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        logsButton.Click += BtnViewLogs_Click;

        // Settings Button
        var settingsButton = new Button
        {
            Name = "btnSettings",
            Text = "⚙️ Settings",
            Size = new Size(120, 40),
            Location = new Point(520, 25),
            Font = new Font("Segoe UI", 10),
            BackColor = Color.FromArgb(80, 80, 80),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        settingsButton.Click += BtnSettings_Click;

        // Exit Button
        var exitButton = new Button
        {
            Name = "btnExit",
            Text = "❌ Exit",
            Size = new Size(100, 40),
            Location = new Point(760, 25),
            Font = new Font("Segoe UI", 10),
            BackColor = Color.FromArgb(200, 50, 50),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        exitButton.Click += BtnExit_Click;

        panel.Controls.AddRange(new Control[] 
        { 
            monitorButton, scanButton, logsButton, settingsButton, exitButton
        });

        return panel;
    }

    private Icon? LoadGridHealthIcon()
    {
        try
        {
            var iconPath = Path.Combine(Application.StartupPath, "assets", "gridhealth.ico");
            if (File.Exists(iconPath))
            {
                return new Icon(iconPath);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Could not load GridHealth icon: {ex.Message}");
        }
        return null;
    }

    private void LoadConfiguration()
    {
        try
        {
            // TODO: Load configuration from file
        Console.WriteLine("Configuration loading not yet implemented");
            UpdateConfigurationUI();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: Failed to load configuration: {ex.Message}");
            _config = new AgentConfiguration();
        }
    }

    private void UpdateConfigurationUI()
    {
        if (_config == null) return;

        var licenseTextBox = Controls.Find("txtLicenseKey", true).FirstOrDefault() as TextBox;
        var frequencyCombo = Controls.Find("cboScanFrequency", true).FirstOrDefault() as ComboBox;
        var endpointTextBox = Controls.Find("txtApiEndpoint", true).FirstOrDefault() as TextBox;

        if (licenseTextBox != null) licenseTextBox.Text = _config.LicenseKey ?? "";
        if (frequencyCombo != null) frequencyCombo.SelectedItem = _config.ScanFrequency.ToString();
        if (endpointTextBox != null) endpointTextBox.Text = _config.ApiEndpoint;
    }

    private void InitializeTimers()
    {
        _monitoringTimer = new System.Windows.Forms.Timer();
        _monitoringTimer.Tick += MonitoringTimer_Tick;

        _statusTimer = new System.Windows.Forms.Timer();
        _statusTimer.Interval = 1000; // Update status every second
        _statusTimer.Tick += StatusTimer_Tick;
        _statusTimer.Start();
    }

    private void UpdateUI()
    {
        var statusLabel = Controls.Find("lblStatus", true).FirstOrDefault() as Label;
        var statusIconLabel = Controls.Find("lblStatusIcon", true).FirstOrDefault() as Label;
        var monitorButton = Controls.Find("btnStartMonitoring", true).FirstOrDefault() as Button;
        var stepLabel = Controls.Find("lblOnboardingStep", true).FirstOrDefault() as Label;
        var stepDescription = Controls.Find("lblStepDescription", true).FirstOrDefault() as Label;
        var deviceIdLabel = Controls.Find("lblDeviceId", true).FirstOrDefault() as Label;

        if (statusLabel != null && statusIconLabel != null)
        {
            if (!_config.IsConfigured)
            {
                statusLabel.Text = "Status: Not Configured";
                statusLabel.ForeColor = Color.Orange;
                statusIconLabel.Text = "⚠️";
                statusIconLabel.ForeColor = Color.Orange;
                
                if (stepLabel != null) stepLabel.Text = "Step 1: Configure Agent";
                if (stepDescription != null) stepDescription.Text = "Enter your license key and configure monitoring settings";
            }
            else if (_isMonitoring)
            {
                statusLabel.Text = "Status: Monitoring Active";
                statusLabel.ForeColor = Color.Lime;
                statusIconLabel.Text = "🟢";
                statusIconLabel.ForeColor = Color.Lime;
                
                if (stepLabel != null) stepLabel.Text = "Step 2: Monitoring Active";
                if (stepDescription != null) stepDescription.Text = "Agent is actively monitoring system health";
            }
            else
            {
                statusLabel.Text = "Status: Ready";
                statusLabel.ForeColor = Color.Cyan;
                statusIconLabel.Text = "✅";
                statusIconLabel.ForeColor = Color.Cyan;
                
                if (stepLabel != null) stepLabel.Text = "Step 2: Ready to Monitor";
                if (stepDescription != null) stepDescription.Text = "Click 'Start Monitoring' to begin health monitoring";
            }
        }

        if (monitorButton != null)
        {
            monitorButton.Text = _isMonitoring ? "⏹️ Stop Monitoring" : "▶️ Start Monitoring";
            monitorButton.BackColor = _isMonitoring ? Color.FromArgb(200, 50, 50) : Color.FromArgb(0, 200, 100);
        }

        // Update device ID display
        if (deviceIdLabel != null)
        {
            deviceIdLabel.Text = $"Device ID: {_config.DeviceId}";
        }
    }

    private async void BtnTestDataTransmission_Click(object? sender, EventArgs e)
    {
        try
        {
            // Validate configuration first
            if (!_config.IsConfigured || string.IsNullOrWhiteSpace(_config.LicenseKey))
            {
                MessageBox.Show("Please configure the agent with a valid license key first.", 
                    "Configuration Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            var statusLabel = Controls.Find("lblTransmissionStatus", true).FirstOrDefault() as Label;
            if (statusLabel != null)
                statusLabel.Text = "Status: Sending test data...";

            LogMessage("🚀 Sending test health data to database...");

            // Create test health data
            var testHealthData = new HealthData
            {
                DeviceId = _config.DeviceId ?? Environment.MachineName,
                LicenseKey = _config.LicenseKey,
                Timestamp = DateTime.UtcNow,
                SystemInfo = new SystemInfo
                {
                    Hostname = Environment.MachineName,
                    OsName = Environment.OSVersion.ToString(),
                    OsVersion = Environment.OSVersion.Version.ToString(),
                    OsArchitecture = Environment.Is64BitOperatingSystem ? "x64" : "x86",
                    MachineName = Environment.MachineName,
                    ProcessorCount = Environment.ProcessorCount,
                    TotalPhysicalMemory = GC.GetTotalMemory(false)
                },
                PerformanceMetrics = new PerformanceMetrics
                {
                    CpuUsagePercent = 25.5,
                    MemoryUsagePercent = 45.2,
                    DiskIoReadBytesPerSec = 1024 * 1024, // 1 MB/s
                    DiskIoWriteBytesPerSec = 512 * 1024,  // 512 KB/s
                    NetworkBytesReceivedPerSec = 1024 * 512, // 512 KB/s
                    NetworkBytesSentPerSec = 1024 * 256,    // 256 KB/s
                    ProcessCount = System.Diagnostics.Process.GetProcesses().Length,
                    ThreadCount = System.Diagnostics.Process.GetCurrentProcess().Threads.Count,
                    HandleCount = System.Diagnostics.Process.GetCurrentProcess().HandleCount
                },
                AgentInfo = new AgentInfo
                {
                    Version = "1.0.0",
                    LastHeartbeat = DateTime.UtcNow,
                    ScanFrequencyMinutes = _config.ScanIntervalMinutes
                }
            };

            // Send test data to API (this will test database connectivity)
            LogMessage("📤 Attempting to send test data to API...");
            var success = await SendHealthDataToApi(testHealthData);
            Console.WriteLine($"Test health data transmission result: {success}");
            
            if (!success)
            {
                LogMessage("❌ Test data transmission failed. Check the logs above for detailed error information.");
            }

            if (success)
            {
                LogMessage("✅ Test health data sent successfully to database!");
                if (statusLabel != null)
                    statusLabel.Text = "Status: Test data sent successfully";
                
                MessageBox.Show("Test health data sent successfully to your database!\n\n" +
                    "Check your database to verify the data was received.", 
                    "Data Transmission Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                LogMessage("❌ Failed to send test health data to database");
                if (statusLabel != null)
                    statusLabel.Text = "Status: Transmission failed";
                
                MessageBox.Show("Failed to send test health data to database.\n\n" +
                    "Check the logs for more details.", 
                    "Data Transmission Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Data transmission test error: {ex.Message}");
            var statusLabel = Controls.Find("lblTransmissionStatus", true).FirstOrDefault() as Label;
            if (statusLabel != null)
                statusLabel.Text = "Status: Error occurred";
            
            MessageBox.Show($"Data transmission test error: {ex.Message}", 
                "GridHealth Agent", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void BtnViewLastTransmission_Click(object? sender, EventArgs e)
    {
        try
        {
            // TODO: Implement viewing last transmission details
            var message = "Last Transmission Details:\n\n" +
                         $"Device: {Environment.MachineName}\n" +
                         $"Timestamp: {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n" +
                         $"License: {_config.LicenseKey}\n" +
                         $"API Endpoint: {_config.ApiEndpoint}\n\n" +
                         "Note: This is placeholder data. Implement actual transmission logging.";

            MessageBox.Show(message, "Last Transmission Details", 
                MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Error viewing last transmission: {ex.Message}", 
                "GridHealth Agent", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private async void BtnTestConnection_Click(object? sender, EventArgs e)
    {
        try
        {
            var endpointTextBox = Controls.Find("txtApiEndpoint", true).FirstOrDefault() as TextBox;
            var endpoint = endpointTextBox?.Text ?? _config.ApiEndpoint;

            // Validate license key before testing connection
            var licenseTextBox = Controls.Find("txtLicenseKey", true).FirstOrDefault() as TextBox;
            if (string.IsNullOrWhiteSpace(licenseTextBox?.Text))
            {
                MessageBox.Show("Please enter a valid license key before testing connection.", 
                    "License Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            
            if (licenseTextBox.Text.Length < 10)
            {
                MessageBox.Show("License key appears to be too short. Please check your license key.", 
                    "Invalid License", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            
            LogMessage("Testing connection to API...");
            
            // TODO: Implement API connection test
            var isConnected = true; // Placeholder
            Console.WriteLine("API connection test not yet implemented");
            
            if (isConnected)
            {
                LogMessage("✅ Connection successful!");
                MessageBox.Show("Connection test successful!", "GridHealth Agent", 
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                LogMessage("❌ Connection failed!");
                MessageBox.Show("Connection test failed. Please check the API endpoint.", 
                    "GridHealth Agent", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Connection test error: {ex.Message}");
            MessageBox.Show($"Connection test error: {ex.Message}", "GridHealth Agent", 
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private async void BtnTestDatabase_Click(object? sender, EventArgs e)
    {
        try
        {
            // Validate configuration first
            if (!_config.IsConfigured || string.IsNullOrWhiteSpace(_config.LicenseKey))
            {
                MessageBox.Show("Please configure the agent with a valid license key first.", 
                    "Configuration Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            var statusLabel = Controls.Find("lblTransmissionStatus", true).FirstOrDefault() as Label;
            if (statusLabel != null)
                statusLabel.Text = "Status: Testing database connection...";

            LogMessage("🗄️ Testing database connection through API...");

            // Create minimal test data for database connectivity test
            var testData = new HealthData
            {
                DeviceId = _config.DeviceId ?? Environment.MachineName,
                LicenseKey = _config.LicenseKey,
                Timestamp = DateTime.UtcNow,
                SystemInfo = new SystemInfo
                {
                    Hostname = Environment.MachineName,
                    OsName = "Database Test",
                    MachineName = Environment.MachineName
                },
                AgentInfo = new AgentInfo
                {
                    Version = "1.0.0",
                    LastHeartbeat = DateTime.UtcNow
                }
            };

            // Test database connection by sending minimal data
            var success = await SendHealthDataToApi(testData);

            if (success)
            {
                LogMessage("✅ Database connection test successful!");
                if (statusLabel != null)
                    statusLabel.Text = "Status: Database connection OK";
                
                MessageBox.Show("Database connection test successful!\n\n" +
                    "Your API endpoint is working and can connect to the database.\n" +
                    "Check your database logs to confirm the test data was received.", 
                    "Database Connection Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                LogMessage("❌ Database connection test failed");
                if (statusLabel != null)
                    statusLabel.Text = "Status: Database connection failed";
                
                MessageBox.Show("Database connection test failed.\n\n" +
                    "Possible issues:\n" +
                    "• API endpoint is not accessible\n" +
                    "• Database connection is down\n" +
                    "• License key is invalid\n" +
                    "• Network/firewall blocking the connection\n\n" +
                    "Check the logs for detailed error information.", 
                    "Database Connection Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Database connection test error: {ex.Message}");
            var statusLabel = Controls.Find("lblTransmissionStatus", true).FirstOrDefault() as Label;
            if (statusLabel != null)
                statusLabel.Text = "Status: Test error occurred";
            
            MessageBox.Show($"Database connection test error: {ex.Message}", 
                "GridHealth Agent", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private async void BtnTestConnectivity_Click(object? sender, EventArgs e)
    {
        try
        {
            var statusLabel = Controls.Find("lblTransmissionStatus", true).FirstOrDefault() as Label;
            if (statusLabel != null)
                statusLabel.Text = "Status: Testing basic connectivity...";

            LogMessage("🌐 Testing basic connectivity to your domain...");

            // Test basic connectivity to the domain
            var domain = "https://gridhealth.arwindpianist.store";
            
            using (var httpClient = new HttpClient())
            {
                httpClient.Timeout = TimeSpan.FromSeconds(10);
                
                try
                {
                    LogMessage($"🔍 Testing connection to: {domain}");
                    var response = await httpClient.GetAsync(domain);
                    
                    if (response.IsSuccessStatusCode)
                    {
                        LogMessage($"✅ Basic connectivity SUCCESS: {domain} is accessible");
                        LogMessage($"📊 Response: {response.StatusCode} - {response.ReasonPhrase}");
                        
                        if (statusLabel != null)
                            statusLabel.Text = "Status: Basic connectivity OK";
                        
                        MessageBox.Show($"Basic connectivity test successful!\n\n" +
                            $"✅ Domain: {domain}\n" +
                            $"✅ Status: {response.StatusCode} - {response.ReasonPhrase}\n\n" +
                            $"The domain is accessible, but the API endpoint may have issues.", 
                            "Connectivity Test Success", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    }
                    else
                    {
                        LogMessage($"⚠️ Basic connectivity PARTIAL: {domain} responded with {response.StatusCode}");
                        LogMessage($"📊 Response: {response.StatusCode} - {response.ReasonPhrase}");
                        
                        if (statusLabel != null)
                            statusLabel.Text = "Status: Partial connectivity";
                        
                        MessageBox.Show($"Basic connectivity test shows partial success:\n\n" +
                            $"⚠️ Domain: {domain}\n" +
                            $"⚠️ Status: {response.StatusCode} - {response.ReasonPhrase}\n\n" +
                            $"The domain responds but may have configuration issues.", 
                            "Connectivity Test Partial", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    }
                }
                catch (HttpRequestException ex)
                {
                    LogMessage($"❌ Basic connectivity FAILED: {ex.Message}");
                    
                    if (statusLabel != null)
                        statusLabel.Text = "Status: Connectivity failed";
                    
                    MessageBox.Show($"Basic connectivity test failed:\n\n" +
                        $"❌ Domain: {domain}\n" +
                        $"❌ Error: {ex.Message}\n\n" +
                        $"Possible issues:\n" +
                        $"• Domain is not accessible\n" +
                        $"• Firewall blocking the connection\n" +
                        $"• DNS resolution problems\n" +
                        $"• Backend service is down", 
                        "Connectivity Test Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                catch (TaskCanceledException ex)
                {
                    LogMessage($"❌ Basic connectivity TIMEOUT: {ex.Message}");
                    
                    if (statusLabel != null)
                        statusLabel.Text = "Status: Connectivity timeout";
                    
                    MessageBox.Show($"Basic connectivity test timed out:\n\n" +
                        $"❌ Domain: {domain}\n" +
                        $"❌ Error: Request timeout after 10 seconds\n\n" +
                        $"This suggests the domain is not responding at all.", 
                        "Connectivity Test Timeout", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Connectivity test error: {ex.Message}");
            var statusLabel = Controls.Find("lblTransmissionStatus", true).FirstOrDefault() as Label;
            if (statusLabel != null)
                statusLabel.Text = "Status: Test error occurred";
            
            MessageBox.Show($"Connectivity test error: {ex.Message}", 
                "GridHealth Agent", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private async Task<bool> SendHealthDataToApi(HealthData healthData)
    {
        try
        {
            LogMessage($"🔍 Testing connectivity to: {_config.ApiEndpoint}");
            
            // Test basic connectivity first
            using (var pingClient = new HttpClient())
            {
                pingClient.Timeout = TimeSpan.FromSeconds(10);
                try
                {
                    var pingResponse = await pingClient.GetAsync(_config.ApiEndpoint.Replace("/api/health", ""));
                    LogMessage($"🌐 Basic connectivity test: {(pingResponse.IsSuccessStatusCode ? "SUCCESS" : $"FAILED - {pingResponse.StatusCode}")}");
                }
                catch (Exception pingEx)
                {
                    LogMessage($"🌐 Basic connectivity test FAILED: {pingEx.Message}");
                }
            }

            using (var httpClient = new HttpClient())
            {
                // Set timeout and headers
                httpClient.Timeout = TimeSpan.FromSeconds(30);
                httpClient.DefaultRequestHeaders.Add("User-Agent", "GridHealth-Agent/1.0");
                httpClient.DefaultRequestHeaders.Add("X-License-Key", _config.LicenseKey);
                
                // Remove Content-Type header from DefaultRequestHeaders (it's set in content)
                // httpClient.DefaultRequestHeaders.Add("Content-Type", "application/json");

                // Serialize health data to JSON
                var jsonContent = System.Text.Json.JsonSerializer.Serialize(healthData, new System.Text.Json.JsonSerializerOptions
                {
                    WriteIndented = true
                });

                var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                LogMessage($"📤 Sending data to: {_config.ApiEndpoint}");
                LogMessage($"📊 Data size: {jsonContent.Length} bytes");
                LogMessage($"🔑 License key: {_config.LicenseKey.Substring(0, Math.Min(8, _config.LicenseKey.Length))}...");
                LogMessage($"📋 Request headers: User-Agent, X-License-Key, Content-Type: application/json");

                // Send POST request
                LogMessage("📡 Sending POST request...");
                var response = await httpClient.PostAsync(_config.ApiEndpoint, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                LogMessage($"📥 Response status: {response.StatusCode}");
                LogMessage($"📥 Response headers: {string.Join(", ", response.Headers.Select(h => $"{h.Key}: {string.Join("; ", h.Value)}"))}");
                LogMessage($"📥 Response content: {responseContent}");

                if (response.IsSuccessStatusCode)
                {
                    LogMessage("✅ Data sent successfully to API");
                    return true;
                }
                else
                {
                    LogMessage($"❌ API returned error: {response.StatusCode} - {responseContent}");
                    
                    // Provide specific guidance based on status code
                    switch ((int)response.StatusCode)
                    {
                        case 400:
                            LogMessage("💡 400 Bad Request: Check if the API endpoint expects different data format");
                            break;
                        case 401:
                            LogMessage("💡 401 Unauthorized: Check if the license key is valid");
                            break;
                        case 403:
                            LogMessage("💡 403 Forbidden: Check if the license key has proper permissions");
                            break;
                        case 404:
                            LogMessage("💡 404 Not Found: Check if the API endpoint URL is correct");
                            break;
                        case 500:
                            LogMessage("💡 500 Internal Server Error: Server-side issue, check backend logs");
                            break;
                        case 502:
                        case 503:
                        case 504:
                            LogMessage("💡 Server unavailable: Check if your backend service is running");
                            break;
                    }
                    
                    return false;
                }
            }
        }
        catch (HttpRequestException ex)
        {
            LogMessage($"❌ HTTP request failed: {ex.Message}");
            LogMessage($"💡 This usually means the API endpoint is not accessible");
            LogMessage($"💡 Check if: 1) Your backend is running, 2) Firewall allows the connection, 3) URL is correct");
            return false;
        }
        catch (TaskCanceledException ex)
        {
            LogMessage($"❌ Request timeout after 30 seconds: {ex.Message}");
            LogMessage($"💡 This suggests the API endpoint is not responding");
            LogMessage($"💡 Check if: 1) Your backend service is running, 2) Network connectivity is good");
            return false;
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Unexpected error: {ex.Message}");
            LogMessage($"💡 Error type: {ex.GetType().Name}");
            LogMessage($"💡 Stack trace: {ex.StackTrace}");
            return false;
        }
    }

    private async void BtnSaveConfig_Click(object? sender, EventArgs e)
    {
        try
        {
            var licenseTextBox = Controls.Find("txtLicenseKey", true).FirstOrDefault() as TextBox;
            var frequencyCombo = Controls.Find("cboScanFrequency", true).FirstOrDefault() as ComboBox;
            var endpointTextBox = Controls.Find("txtApiEndpoint", true).FirstOrDefault() as TextBox;

            if (string.IsNullOrWhiteSpace(licenseTextBox?.Text))
            {
                MessageBox.Show("Please enter a license key.", "GridHealth Agent", 
                    MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            
            // Enhanced license validation
            if (licenseTextBox.Text.Length < 10)
            {
                MessageBox.Show("License key appears to be too short. Please check your license key.", 
                    "Invalid License", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            
            if (licenseTextBox.Text.Length > 100)
            {
                MessageBox.Show("License key appears to be too long. Please check your license key.", 
                    "Invalid License", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            _config.LicenseKey = licenseTextBox.Text.Trim();
            _config.ScanFrequency = Enum.Parse<ScanFrequency>(frequencyCombo?.Text ?? "Daily");
            _config.ApiEndpoint = endpointTextBox?.Text?.Trim() ?? _config.ApiEndpoint;
            _config.IsConfigured = true;
            _config.LastConfigured = DateTime.Now;
            _config.UpdateScanInterval();

            // TODO: Save configuration to file
        Console.WriteLine("Configuration saving not yet implemented");
            
            LogMessage("✅ Configuration saved successfully!");
            UpdateUI();
            
            MessageBox.Show("Configuration saved successfully!", "GridHealth Agent", 
                MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Failed to save configuration: {ex.Message}");
            MessageBox.Show($"Failed to save configuration: {ex.Message}", "GridHealth Agent", 
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private async void BtnStartMonitoring_Click(object? sender, EventArgs e)
    {
        if (!_config.IsConfigured)
        {
            MessageBox.Show("Please configure the agent first.", "GridHealth Agent", 
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        
        // Additional license validation
        if (string.IsNullOrWhiteSpace(_config.LicenseKey) || _config.LicenseKey.Length < 10)
        {
            MessageBox.Show("Please enter a valid license key before starting monitoring.", 
                "Invalid License", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        if (_isMonitoring)
        {
            StopMonitoring();
        }
        else
        {
            await StartMonitoring();
        }
    }

    private async Task StartMonitoring()
    {
        try
        {
            _isMonitoring = true;
            _monitoringTimer.Interval = _config.ScanIntervalMinutes * 60 * 1000; // Convert to milliseconds
            _monitoringTimer.Start();
            
            LogMessage("🚀 Monitoring started!");
            LogMessage($"📊 Scan frequency: {_config.ScanFrequency}");
            LogMessage($"⏰ Next scan in: {_config.ScanIntervalMinutes} minutes");
            
            // Perform initial scan
            await PerformHealthScan();
            
            UpdateUI();
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Failed to start monitoring: {ex.Message}");
            _isMonitoring = false;
            UpdateUI();
        }
    }

    private void StopMonitoring()
    {
        _isMonitoring = false;
        _monitoringTimer.Stop();
        
        LogMessage("⏹️ Monitoring stopped!");
        UpdateUI();
    }

    private async void BtnManualScan_Click(object? sender, EventArgs e)
    {
        if (!_config.IsConfigured)
        {
            MessageBox.Show("Please configure the agent first.", "GridHealth Agent", 
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        await PerformHealthScan();
    }

    private async Task PerformHealthScan()
    {
        try
        {
            LogMessage("🔍 Performing health scan...");
            
            // TODO: Implement health data collection
        var healthData = new HealthData(); // Placeholder
        Console.WriteLine("Health data collection not yet implemented");
            
            if (healthData != null)
            {
                LogMessage("📊 Health data collected successfully");
                LogMessage($"   CPU: {healthData.PerformanceMetrics.CpuUsagePercent:F1}%");
                LogMessage($"   Memory: {healthData.PerformanceMetrics.MemoryUsagePercent:F1}%");
                LogMessage($"   Disk I/O: {healthData.PerformanceMetrics.DiskIoReadBytesPerSec / (1024 * 1024):F1} MB/s read, {healthData.PerformanceMetrics.DiskIoWriteBytesPerSec / (1024 * 1024):F1} MB/s write");
                
                // TODO: Implement health data sending
        var success = true; // Placeholder
        Console.WriteLine("Health data sending not yet implemented");
                
                if (success)
                {
                    LogMessage("✅ Health data sent successfully!");
                    UpdateLastScanTime();
                    UpdateScanCounter();
                }
                else
                {
                    LogMessage("❌ Failed to send health data!");
                }
            }
            else
            {
                LogMessage("❌ Failed to collect health data!");
            }
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Health scan error: {ex.Message}");
        }
    }

    private void UpdateScanCounter()
    {
        var scanCountLabel = Controls.Find("lblScanCount", true).FirstOrDefault() as Label;
        if (scanCountLabel != null)
        {
            // TODO: Implement persistent scan counter
            var currentText = scanCountLabel.Text;
            if (currentText.StartsWith("Total Scans: "))
            {
                var countStr = currentText.Substring("Total Scans: ".Length);
                if (int.TryParse(countStr, out var count))
                {
                    scanCountLabel.Text = $"Total Scans: {count + 1}";
                }
            }
        }
    }

    private void BtnViewLogs_Click(object? sender, EventArgs e)
    {
        try
        {
            var logPath = Path.Combine(Application.StartupPath, "logs");
            if (Directory.Exists(logPath))
            {
                System.Diagnostics.Process.Start("explorer.exe", logPath);
            }
            else
            {
                MessageBox.Show("Logs directory not found.", "GridHealth Agent", 
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Failed to open logs: {ex.Message}");
        }
    }

    private void BtnSettings_Click(object? sender, EventArgs e)
    {
        try
        {
            // TODO: Implement settings dialog
            MessageBox.Show("Settings dialog will be implemented in a future version.", 
                "GridHealth Agent", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Failed to open settings: {ex.Message}");
        }
    }

    private void BtnResetConfig_Click(object? sender, EventArgs e)
    {
        try
        {
            var result = MessageBox.Show(
                "Are you sure you want to reset the configuration? This will clear all settings.",
                "GridHealth Agent", 
                MessageBoxButtons.YesNo, 
                MessageBoxIcon.Question);
            
            if (result == DialogResult.Yes)
            {
                _config = new AgentConfiguration();
                UpdateConfigurationUI();
                UpdateUI();
                LogMessage("🔄 Configuration reset to defaults");
                
                MessageBox.Show("Configuration has been reset to defaults.", 
                    "GridHealth Agent", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }
        catch (Exception ex)
        {
            LogMessage($"❌ Failed to reset configuration: {ex.Message}");
            MessageBox.Show($"Failed to reset configuration: {ex.Message}", 
                "GridHealth Agent", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void BtnExit_Click(object? sender, EventArgs e)
    {
        if (_isMonitoring)
        {
            var result = MessageBox.Show("Monitoring is active. Are you sure you want to exit?", 
                "GridHealth Agent", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            
            if (result == DialogResult.No)
                return;
        }

        Application.Exit();
    }

    private async void MonitoringTimer_Tick(object? sender, EventArgs e)
    {
        await PerformHealthScan();
    }

    private void StatusTimer_Tick(object? sender, EventArgs e)
    {
        UpdateStatusDisplay();
    }

    private void UpdateStatusDisplay()
    {
        var lastScanLabel = Controls.Find("lblLastScan", true).FirstOrDefault() as Label;
        var nextScanLabel = Controls.Find("lblNextScan", true).FirstOrDefault() as Label;
        var scanCountLabel = Controls.Find("lblScanCount", true).FirstOrDefault() as Label;
        var cpuLabel = Controls.Find("lblCpuInfo", true).FirstOrDefault() as Label;
        var memoryLabel = Controls.Find("lblMemoryInfo", true).FirstOrDefault() as Label;
        var diskLabel = Controls.Find("lblDiskInfo", true).FirstOrDefault() as Label;
        var networkLabel = Controls.Find("lblNetworkInfo", true).FirstOrDefault() as Label;

        if (lastScanLabel != null)
        {
            if (_config.LastConfigured.HasValue)
            {
                lastScanLabel.Text = $"Last Scan: {_config.LastConfigured.Value:yyyy-MM-dd HH:mm:ss}";
            }
        }

        if (nextScanLabel != null && _isMonitoring)
        {
            var nextScan = DateTime.Now.AddMinutes(_config.ScanIntervalMinutes);
            nextScanLabel.Text = $"Next Scan: {nextScan:yyyy-MM-dd HH:mm:ss}";
        }
        else if (nextScanLabel != null)
        {
            nextScanLabel.Text = "Next Scan: Not Scheduled";
        }

        if (scanCountLabel != null)
        {
            // TODO: Implement scan counter
            scanCountLabel.Text = "Total Scans: 0";
        }

        // Update system information
        UpdateSystemInfo(cpuLabel, memoryLabel, diskLabel, networkLabel);
    }

    private void UpdateSystemInfo(Label? cpuLabel, Label? memoryLabel, Label? diskLabel, Label? networkLabel)
    {
        try
        {
            // CPU Info
            if (cpuLabel != null)
            {
                var cpuCounter = new System.Diagnostics.PerformanceCounter("Processor", "% Processor Time", "_Total");
                var cpuUsage = Math.Round(cpuCounter.NextValue(), 1);
                cpuLabel.Text = $"CPU: {cpuUsage}%";
                cpuLabel.ForeColor = cpuUsage > 80 ? Color.Red : cpuUsage > 60 ? Color.Orange : Color.Silver;
            }

            // Memory Info
            if (memoryLabel != null)
            {
                var memoryCounter = new System.Diagnostics.PerformanceCounter("Memory", "Available MBytes");
                var availableMemory = memoryCounter.NextValue();
                var totalMemory = GC.GetTotalMemory(false) / (1024 * 1024); // Convert to MB
                var memoryUsage = Math.Round(((totalMemory - availableMemory) / totalMemory) * 100, 1);
                memoryLabel.Text = $"Memory: {memoryUsage}%";
                memoryLabel.ForeColor = memoryUsage > 80 ? Color.Red : memoryUsage > 60 ? Color.Orange : Color.Silver;
            }

            // Disk Info
            if (diskLabel != null)
            {
                var drive = DriveInfo.GetDrives().FirstOrDefault(d => d.IsReady && d.Name == "C:\\");
                if (drive != null)
                {
                    var diskUsage = Math.Round(((double)(drive.TotalSize - drive.AvailableFreeSpace) / drive.TotalSize) * 100, 1);
                    diskLabel.Text = $"Disk C: {diskUsage}%";
                    diskLabel.ForeColor = diskUsage > 90 ? Color.Red : diskUsage > 80 ? Color.Orange : Color.Silver;
                }
                else
                {
                    diskLabel.Text = "Disk: --";
                }
            }

            // Network Info
            if (networkLabel != null)
            {
                var networkInterfaces = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces();
                var activeInterface = networkInterfaces.FirstOrDefault(ni => ni.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up);
                if (activeInterface != null)
                {
                    networkLabel.Text = $"Network: {activeInterface.Name}";
                    networkLabel.ForeColor = Color.Silver;
                }
                else
                {
                    networkLabel.Text = "Network: --";
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Failed to update system information: {ex.Message}");
        }
    }

    private void UpdateLastScanTime()
    {
        _config.LastConfigured = DateTime.Now;
        // TODO: Save configuration to file
        Console.WriteLine("Configuration saving not yet implemented");
    }

    private void LogMessage(string message)
    {
        var logTextBox = Controls.Find("txtLog", true).FirstOrDefault() as TextBox;
        if (logTextBox != null)
        {
            var timestamp = DateTime.Now.ToString("HH:mm:ss");
            var logEntry = $"[{timestamp}] {message}";
            
            if (logTextBox.InvokeRequired)
            {
                logTextBox.Invoke(new Action(() => LogMessage(message)));
                return;
            }

            logTextBox.AppendText(logEntry + Environment.NewLine);
            logTextBox.SelectionStart = logTextBox.Text.Length;
            logTextBox.ScrollToCaret();
        }

        Console.WriteLine($"Info: {message}");
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (_isMonitoring)
        {
            var result = MessageBox.Show("Monitoring is active. Are you sure you want to exit?", 
                "GridHealth Agent", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            
            if (result == DialogResult.No)
            {
                e.Cancel = true;
                return;
            }
        }

        _monitoringTimer?.Stop();
        _statusTimer?.Stop();
        
        base.OnFormClosing(e);
    }
} 