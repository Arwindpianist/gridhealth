using System.Drawing;
using System.Windows.Forms;
using Microsoft.Extensions.Logging;
using GridHealth.Agent.Models;
using GridHealth.Agent.Services;

namespace GridHealth.Agent.Forms;

public partial class OnboardingForm : Form
{
    private readonly IConfigurationManager _configManager;
    private readonly IApiClientService _apiClient;
    private readonly ILogger<OnboardingForm> _logger;
    
    private AgentConfiguration _config;

    public OnboardingForm(IConfigurationManager configManager, IApiClientService apiClient, ILogger<OnboardingForm> logger)
    {
        _configManager = configManager;
        _apiClient = apiClient;
        _logger = logger;
        
        InitializeComponent();
        LoadConfiguration();
    }

    private void InitializeComponent()
    {
        this.SuspendLayout();
        
        // Form properties
        this.Text = "GridHealth Agent - Welcome";
        this.Size = new Size(900, 700);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.FormBorderStyle = FormBorderStyle.FixedSingle;
        this.MaximizeBox = false;
        this.BackColor = Color.FromArgb(18, 18, 18);
        
        // Set form icon
        try
        {
            string iconPath = Path.Combine(Application.StartupPath, "assets", "favicon.ico");
            if (File.Exists(iconPath))
            {
                this.Icon = new Icon(iconPath);
            }
        }
        catch
        {
            // Silently handle icon loading errors
        }
        
        // Main panel
        var mainPanel = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(18, 18, 18)
        };

        // Header with branding
        var headerPanel = CreateHeaderPanel();
        mainPanel.Controls.Add(headerPanel);

        // Welcome message
        var welcomePanel = CreateWelcomePanel();
        mainPanel.Controls.Add(welcomePanel);

        // Configuration panel
        var configPanel = CreateConfigurationPanel();
        mainPanel.Controls.Add(configPanel);

        // Action panel
        var actionPanel = CreateActionPanel();
        mainPanel.Controls.Add(actionPanel);

        // Layout panels
        headerPanel.Dock = DockStyle.Top;
        headerPanel.Height = 120;
        
        welcomePanel.Dock = DockStyle.Top;
        welcomePanel.Height = 150;
        
        configPanel.Dock = DockStyle.Fill;
        
        actionPanel.Dock = DockStyle.Bottom;
        actionPanel.Height = 100;

        this.Controls.Add(mainPanel);
        this.ResumeLayout(false);
    }

    private Panel CreateHeaderPanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(25, 25, 25),
            Padding = new Padding(30)
        };

        // GridHealth logo/branding
        var logoLabel = new Label
        {
            Text = "🟢 GridHealth",
            Font = new Font("Segoe UI", 28, FontStyle.Bold),
            ForeColor = Color.FromArgb(0, 255, 127),
            AutoSize = true,
            Location = new Point(30, 20)
        };

        var subtitleLabel = new Label
        {
            Text = "Enterprise System Health Monitoring",
            Font = new Font("Segoe UI", 14),
            ForeColor = Color.FromArgb(180, 180, 180),
            AutoSize = true,
            Location = new Point(30, 60)
        };

        var versionLabel = new Label
        {
            Text = "Agent v1.0.0",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.FromArgb(120, 120, 120),
            AutoSize = true,
            Location = new Point(30, 85)
        };

        panel.Controls.AddRange(new Control[] { logoLabel, subtitleLabel, versionLabel });

        return panel;
    }

    private Panel CreateWelcomePanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(22, 22, 22),
            Padding = new Padding(30)
        };

        var welcomeLabel = new Label
        {
            Text = "Welcome to GridHealth Agent!",
            Font = new Font("Segoe UI", 18, FontStyle.Bold),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(30, 20)
        };

        var descriptionLabel = new Label
        {
            Text = "Let's get your system monitoring set up. You'll need your GridHealth license key to continue.",
            Font = new Font("Segoe UI", 11),
            ForeColor = Color.FromArgb(200, 200, 200),
            AutoSize = true,
            Location = new Point(30, 60),
            Size = new Size(800, 60)
        };

        panel.Controls.AddRange(new Control[] { welcomeLabel, descriptionLabel });

        return panel;
    }

    private Panel CreateConfigurationPanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(22, 22, 22),
            Padding = new Padding(30)
        };

        // License Key Section
        var licenseGroup = CreateLicenseGroup();
        licenseGroup.Location = new Point(30, 20);
        panel.Controls.Add(licenseGroup);

        // Scan Frequency Section
        var frequencyGroup = CreateFrequencyGroup();
        frequencyGroup.Location = new Point(30, 200);
        panel.Controls.Add(frequencyGroup);

        // API Endpoint Section
        var endpointGroup = CreateEndpointGroup();
        endpointGroup.Location = new Point(30, 350);
        panel.Controls.Add(endpointGroup);

        return panel;
    }

    private GroupBox CreateLicenseGroup()
    {
        var group = new GroupBox
        {
            Text = "License Configuration",
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            ForeColor = Color.White,
            Size = new Size(800, 150),
            BackColor = Color.FromArgb(30, 30, 30)
        };

        var licenseLabel = new Label
        {
            Text = "License Key:",
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(20, 30)
        };

        var licenseTextBox = new TextBox
        {
            Name = "txtLicenseKey",
            Size = new Size(400, 30),
            Location = new Point(20, 55),
            Font = new Font("Segoe UI", 12),
            BackColor = Color.FromArgb(45, 45, 45),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle,
            PlaceholderText = "Enter your GridHealth license key..."
        };

        var licenseHelpLabel = new Label
        {
            Text = "You can find your license key in your GridHealth dashboard or purchase confirmation email.",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.FromArgb(150, 150, 150),
            AutoSize = true,
            Location = new Point(20, 95),
            Size = new Size(500, 40)
        };

        group.Controls.AddRange(new Control[] { licenseLabel, licenseTextBox, licenseHelpLabel });

        return group;
    }

    private GroupBox CreateFrequencyGroup()
    {
        var group = new GroupBox
        {
            Text = "Scan Frequency",
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            ForeColor = Color.White,
            Size = new Size(800, 130),
            BackColor = Color.FromArgb(30, 30, 30)
        };

        var frequencyLabel = new Label
        {
            Text = "How often should the agent collect system health data?",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(20, 30)
        };

        var dailyRadio = new RadioButton
        {
            Name = "rbDaily",
            Text = "Daily (Recommended)",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(20, 60),
            Checked = true
        };

        var weeklyRadio = new RadioButton
        {
            Name = "rbWeekly",
            Text = "Weekly",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(200, 60)
        };

        var monthlyRadio = new RadioButton
        {
            Name = "rbMonthly",
            Text = "Monthly",
            Font = new Font("Segoe UI", 10),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(350, 60)
        };

        var frequencyHelpLabel = new Label
        {
            Text = "More frequent scans provide better monitoring but may increase network usage.",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.FromArgb(150, 150, 150),
            AutoSize = true,
            Location = new Point(20, 95),
            Size = new Size(500, 20)
        };

        group.Controls.AddRange(new Control[] { frequencyLabel, dailyRadio, weeklyRadio, monthlyRadio, frequencyHelpLabel });

        return group;
    }

    private GroupBox CreateEndpointGroup()
    {
        var group = new GroupBox
        {
            Text = "API Configuration",
            Font = new Font("Segoe UI", 11, FontStyle.Bold),
            ForeColor = Color.White,
            Size = new Size(800, 130),
            BackColor = Color.FromArgb(30, 30, 30)
        };

        var endpointLabel = new Label
        {
            Text = "API Endpoint:",
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            ForeColor = Color.White,
            AutoSize = true,
            Location = new Point(20, 30)
        };

        var endpointTextBox = new TextBox
        {
            Name = "txtApiEndpoint",
            Size = new Size(400, 30),
            Location = new Point(20, 55),
            Font = new Font("Segoe UI", 12),
            BackColor = Color.FromArgb(45, 45, 45),
            ForeColor = Color.White,
            BorderStyle = BorderStyle.FixedSingle,
            Text = "https://gridhealth.arwindpianist.store"
        };

        var testButton = new Button
        {
            Name = "btnTestConnection",
            Text = "Test Connection",
            Size = new Size(120, 30),
            Location = new Point(440, 55),
            Font = new Font("Segoe UI", 9),
            BackColor = Color.FromArgb(0, 120, 215),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        testButton.Click += BtnTestConnection_Click;

        var endpointHelpLabel = new Label
        {
            Text = "This is the GridHealth API endpoint. Only change this if you're using a custom deployment.",
            Font = new Font("Segoe UI", 9),
            ForeColor = Color.FromArgb(150, 150, 150),
            AutoSize = true,
            Location = new Point(20, 95),
            Size = new Size(500, 20)
        };

        group.Controls.AddRange(new Control[] { endpointLabel, endpointTextBox, testButton, endpointHelpLabel });

        return group;
    }

    private Panel CreateActionPanel()
    {
        var panel = new Panel
        {
            BackColor = Color.FromArgb(25, 25, 25),
            Padding = new Padding(30)
        };

        var skipButton = new Button
        {
            Name = "btnSkip",
            Text = "Skip for Now",
            Size = new Size(120, 40),
            Location = new Point(20, 20),
            Font = new Font("Segoe UI", 10),
            BackColor = Color.FromArgb(80, 80, 80),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        skipButton.Click += BtnSkip_Click;

        var continueButton = new Button
        {
            Name = "btnContinue",
            Text = "Continue to Monitoring",
            Size = new Size(180, 40),
            Location = new Point(680, 20),
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            BackColor = Color.FromArgb(0, 200, 100),
            ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat
        };
        continueButton.Click += BtnContinue_Click;

        panel.Controls.AddRange(new Control[] { skipButton, continueButton });

        return panel;
    }

    private void LoadConfiguration()
    {
        try
        {
            _config = _configManager.LoadConfigurationAsync().Result;
            UpdateConfigurationUI();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to load configuration");
            _config = new AgentConfiguration();
        }
    }

    private void UpdateConfigurationUI()
    {
        if (_config == null) return;

        var licenseTextBox = Controls.Find("txtLicenseKey", true).FirstOrDefault() as TextBox;
        var endpointTextBox = Controls.Find("txtApiEndpoint", true).FirstOrDefault() as TextBox;
        var dailyRadio = Controls.Find("rbDaily", true).FirstOrDefault() as RadioButton;
        var weeklyRadio = Controls.Find("rbWeekly", true).FirstOrDefault() as RadioButton;
        var monthlyRadio = Controls.Find("rbMonthly", true).FirstOrDefault() as RadioButton;

        if (licenseTextBox != null) licenseTextBox.Text = _config.LicenseKey ?? "";
        if (endpointTextBox != null) endpointTextBox.Text = _config.ApiEndpoint;

        if (dailyRadio != null && weeklyRadio != null && monthlyRadio != null)
        {
            switch (_config.ScanFrequency)
            {
                case ScanFrequency.Daily:
                    dailyRadio.Checked = true;
                    break;
                case ScanFrequency.Weekly:
                    weeklyRadio.Checked = true;
                    break;
                case ScanFrequency.Monthly:
                    monthlyRadio.Checked = true;
                    break;
            }
        }
    }

    private async void BtnTestConnection_Click(object? sender, EventArgs e)
    {
        try
        {
            var endpointTextBox = Controls.Find("txtApiEndpoint", true).FirstOrDefault() as TextBox;
            var endpoint = endpointTextBox?.Text ?? _config.ApiEndpoint;

            var testButton = sender as Button;
            if (testButton != null)
            {
                testButton.Enabled = false;
                testButton.Text = "Testing...";
            }

            var isConnected = await _apiClient.TestConnectionAsync(endpoint);
            
            if (isConnected)
            {
                MessageBox.Show("✅ Connection successful!\n\nYour agent can communicate with the GridHealth API.", 
                    "Connection Test", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            else
            {
                MessageBox.Show("❌ Connection failed!\n\nPlease check your internet connection and API endpoint.", 
                    "Connection Test", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show($"❌ Connection test error:\n{ex.Message}", 
                "Connection Test", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        finally
        {
            var testButton = Controls.Find("btnTestConnection", true).FirstOrDefault() as Button;
            if (testButton != null)
            {
                testButton.Enabled = true;
                testButton.Text = "Test Connection";
            }
        }
    }

    private void BtnSkip_Click(object? sender, EventArgs e)
    {
        var result = MessageBox.Show(
            "Are you sure you want to skip configuration?\n\nYou can configure the agent later from the main window.",
            "Skip Configuration", 
            MessageBoxButtons.YesNo, 
            MessageBoxIcon.Question);
        
        if (result == DialogResult.Yes)
        {
            this.DialogResult = DialogResult.Cancel;
            this.Close();
        }
    }

    private async void BtnContinue_Click(object? sender, EventArgs e)
    {
        try
        {
            var licenseTextBox = Controls.Find("txtLicenseKey", true).FirstOrDefault() as TextBox;
            var endpointTextBox = Controls.Find("txtApiEndpoint", true).FirstOrDefault() as TextBox;
            var dailyRadio = Controls.Find("rbDaily", true).FirstOrDefault() as RadioButton;
            var weeklyRadio = Controls.Find("rbWeekly", true).FirstOrDefault() as RadioButton;
            var monthlyRadio = Controls.Find("rbMonthly", true).FirstOrDefault() as RadioButton;

            if (string.IsNullOrWhiteSpace(licenseTextBox?.Text))
            {
                MessageBox.Show("Please enter your GridHealth license key to continue.", 
                    "Configuration Required", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // Determine scan frequency
            ScanFrequency frequency = ScanFrequency.Daily;
            if (weeklyRadio?.Checked == true)
                frequency = ScanFrequency.Weekly;
            else if (monthlyRadio?.Checked == true)
                frequency = ScanFrequency.Monthly;

            // Update configuration
            _config.LicenseKey = licenseTextBox.Text.Trim();
            _config.ScanFrequency = frequency;
            _config.ApiEndpoint = endpointTextBox?.Text?.Trim() ?? _config.ApiEndpoint;
            _config.IsConfigured = true;
            _config.LastConfigured = DateTime.Now;
            _config.UpdateScanInterval();

            // Save configuration
            await _configManager.SaveConfigurationAsync(_config);
            
            MessageBox.Show("✅ Configuration saved successfully!\n\nYour GridHealth Agent is now ready to monitor your system.", 
                "Configuration Complete", MessageBoxButtons.OK, MessageBoxIcon.Information);
            
            this.DialogResult = DialogResult.OK;
            this.Close();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"❌ Failed to save configuration:\n{ex.Message}", 
                "Configuration Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
} 