using System;
using System.Drawing;
using System.Windows.Forms;
using System.IO;
using GridHealth.Agent.Models;
using GridHealth.Agent.Services;

namespace GridHealth.Agent.Forms
{
    public partial class ConfigurationForm : Form
    {
        private TextBox txtLicenseKey;
        private ComboBox cboScanFrequency;
        private TextBox txtApiEndpoint;
        private Button btnSave;
        private Button btnCancel;
        private Label lblTitle;
        private Label lblLicenseKey;
        private Label lblScanFrequency;
        private Label lblApiEndpoint;
        private Label lblNote;

        public AgentConfiguration Configuration { get; private set; }

        public ConfigurationForm(AgentConfiguration? existingConfig = null)
        {
            Configuration = existingConfig ?? new AgentConfiguration();
            InitializeComponent();
            LoadConfiguration();
        }

        private void InitializeComponent()
        {
            this.SuspendLayout();

            // Form properties
            this.Text = "GridHealth Agent Configuration";
            this.Size = new Size(500, 400);
            this.StartPosition = FormStartPosition.CenterParent;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(8, 11, 25);
            this.ForeColor = Color.White;

            // Title
            lblTitle = new Label
            {
                Text = "GridHealth Agent Configuration",
                Font = new Font("Segoe UI", 18, FontStyle.Bold),
                ForeColor = Color.FromArgb(139, 92, 246), // Purple
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Top,
                Height = 60,
                Padding = new Padding(20, 15, 20, 15)
            };

            // License Key
            lblLicenseKey = new Label
            {
                Text = "License Key:",
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                ForeColor = Color.FromArgb(203, 213, 225), // Slate-300
                Location = new Point(30, 80),
                Size = new Size(120, 25),
                TextAlign = ContentAlignment.MiddleLeft
            };

            txtLicenseKey = new TextBox
            {
                Location = new Point(160, 80),
                Size = new Size(300, 25),
                Font = new Font("Segoe UI", 10),
                BackColor = Color.FromArgb(15, 23, 42), // Dark blue
                ForeColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle
            };

            // Scan Frequency
            lblScanFrequency = new Label
            {
                Text = "Scan Frequency:",
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                ForeColor = Color.FromArgb(203, 213, 225),
                Location = new Point(30, 120),
                Size = new Size(120, 25),
                TextAlign = ContentAlignment.MiddleLeft
            };

            cboScanFrequency = new ComboBox
            {
                Location = new Point(160, 120),
                Size = new Size(300, 25),
                Font = new Font("Segoe UI", 10),
                BackColor = Color.FromArgb(15, 23, 42),
                ForeColor = Color.White,
                DropDownStyle = ComboBoxStyle.DropDownList
            };

            cboScanFrequency.Items.AddRange(new object[]
            {
                "Daily",
                "Weekly", 
                "Monthly"
            });

            // API Endpoint
            lblApiEndpoint = new Label
            {
                Text = "API Endpoint:",
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                ForeColor = Color.FromArgb(203, 213, 225),
                Location = new Point(30, 160),
                Size = new Size(120, 25),
                TextAlign = ContentAlignment.MiddleLeft
            };

            txtApiEndpoint = new TextBox
            {
                Location = new Point(160, 160),
                Size = new Size(300, 25),
                Font = new Font("Segoe UI", 10),
                BackColor = Color.FromArgb(15, 23, 42),
                ForeColor = Color.FromArgb(156, 163, 175), // Gray-400
                BorderStyle = BorderStyle.FixedSingle,
                ReadOnly = true,
                Text = "https://gridhealth.arwindpianist.store/api/health"
            };

            // Note
            lblNote = new Label
            {
                Text = "Note: The API endpoint is pre-configured and cannot be changed.\n" +
                       "Please ensure your IT team has whitelisted this domain.",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(156, 163, 175), // Gray-400
                Location = new Point(30, 200),
                Size = new Size(430, 40),
                TextAlign = ContentAlignment.MiddleLeft
            };

            // Buttons
            btnSave = new Button
            {
                Text = "Save Configuration",
                Location = new Point(160, 260),
                Size = new Size(140, 35),
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                BackColor = Color.FromArgb(59, 130, 246), // Blue-500
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnSave.Click += BtnSave_Click;

            btnCancel = new Button
            {
                Text = "Cancel",
                Location = new Point(320, 260),
                Size = new Size(140, 35),
                Font = new Font("Segoe UI", 10),
                BackColor = Color.FromArgb(55, 65, 81), // Gray-600
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnCancel.Click += BtnCancel_Click;

            // Add controls
            this.Controls.AddRange(new Control[]
            {
                lblTitle,
                lblLicenseKey,
                txtLicenseKey,
                lblScanFrequency,
                cboScanFrequency,
                lblApiEndpoint,
                txtApiEndpoint,
                lblNote,
                btnSave,
                btnCancel
            });

            this.ResumeLayout(false);
        }

        private void LoadConfiguration()
        {
            if (Configuration != null)
            {
                txtLicenseKey.Text = Configuration.LicenseKey ?? "";
                
                if (Configuration.ScanFrequency != ScanFrequency.Daily)
                {
                    cboScanFrequency.SelectedItem = Configuration.ScanFrequency.ToString();
                }
                else
                {
                    cboScanFrequency.SelectedIndex = 0; // Default to Daily
                }
            }
            else
            {
                cboScanFrequency.SelectedIndex = 0; // Default to Daily
            }
        }

        private async void BtnSave_Click(object sender, EventArgs e)
        {
            try
            {
                // Basic validation
                if (string.IsNullOrWhiteSpace(txtLicenseKey.Text))
                {
                    MessageBox.Show("Please enter a valid license key.", "Validation Error", 
                        MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    txtLicenseKey.Focus();
                    return;
                }

                if (txtLicenseKey.Text.Length < 10)
                {
                    MessageBox.Show("License key appears to be too short. Please enter a valid license key.", 
                        "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    txtLicenseKey.Focus();
                    return;
                }

                // Show validation progress
                btnSave.Enabled = false;
                btnSave.Text = "Validating...";
                Application.DoEvents();

                // Validate license with API
                var licenseService = new LicenseValidationService();
                var validationResult = await licenseService.ValidateLicenseAsync(
                    txtLicenseKey.Text.Trim(), 
                    txtApiEndpoint.Text
                );

                if (!validationResult.IsValid)
                {
                    MessageBox.Show($"License validation failed: {validationResult.Message}\n\nPlease enter a valid license key.", 
                        "Invalid License", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    txtLicenseKey.Focus();
                    btnSave.Enabled = true;
                    btnSave.Text = "Save Configuration";
                    return;
                }

                // License is valid - show success message
                MessageBox.Show($"✅ License validated successfully!\n\nOrganization: {validationResult.OrganizationName}\nDevice Limit: {validationResult.DeviceLimit}\nLicense Type: {validationResult.LicenseType}", 
                    "License Valid", MessageBoxButtons.OK, MessageBoxIcon.Information);

                // Create configuration
                Configuration = new AgentConfiguration
                {
                    LicenseKey = txtLicenseKey.Text.Trim(),
                    ScanFrequency = ParseScanFrequency(cboScanFrequency.SelectedItem?.ToString() ?? "Daily"),
                    ApiEndpoint = txtApiEndpoint.Text,
                    IsConfigured = true,
                    LastConfigured = DateTime.UtcNow,
                    OrganizationName = validationResult.OrganizationName,
                    DeviceLimit = validationResult.DeviceLimit,
                    LicenseType = validationResult.LicenseType
                };

                // Save configuration
                SaveConfiguration();

                MessageBox.Show("Configuration saved successfully!\n\n" +
                              "The GridHealth Agent will now start monitoring your system.", 
                              "Configuration Saved", MessageBoxButtons.OK, MessageBoxIcon.Information);

                this.DialogResult = DialogResult.OK;
                this.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error saving configuration: {ex.Message}", "Save Error", 
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnCancel_Click(object sender, EventArgs e)
        {
            this.DialogResult = DialogResult.Cancel;
            this.Close();
        }

        private ScanFrequency ParseScanFrequency(string frequency)
        {
            return frequency?.ToLower() switch
            {
                "weekly" => ScanFrequency.Weekly,
                "monthly" => ScanFrequency.Monthly,
                _ => ScanFrequency.Daily
            };
        }

        private void SaveConfiguration()
        {
            try
            {
                // Create directory if it doesn't exist
                string configDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "GridHealth"
                );
                Directory.CreateDirectory(configDir);

                string configPath = Path.Combine(configDir, "config.json");
                string json = System.Text.Json.JsonSerializer.Serialize(Configuration, new System.Text.Json.JsonSerializerOptions
                {
                    WriteIndented = true
                });

                File.WriteAllText(configPath, json);
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to save configuration: {ex.Message}");
            }
        }
    }
} 