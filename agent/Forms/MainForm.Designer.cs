namespace GridHealth.Agent.Forms
{
    partial class MainForm
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.components = new System.ComponentModel.Container();
            
            // Form settings
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(800, 650); // Increased height from 600 to 650
            this.Text = "GridHealth Agent";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(8, 11, 25);
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);
            
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

            // Header Panel
            this.headerPanel = new Panel();
            this.headerPanel.Dock = DockStyle.Top;
            this.headerPanel.Height = 80;
            this.headerPanel.BackColor = Color.FromArgb(15, 23, 42);
            this.headerPanel.Padding = new Padding(20, 15, 20, 15);

            this.lblTitle = new Label();
            this.lblTitle.Text = "GridHealth Agent";
            this.lblTitle.Font = new Font("Segoe UI", 24F, FontStyle.Bold);
            this.lblTitle.ForeColor = Color.FromArgb(139, 92, 246); // Purple-500
            this.lblTitle.AutoSize = true;
            this.lblTitle.Location = new Point(20, 20);
            this.headerPanel.Controls.Add(this.lblTitle);

            // Instructions Panel
            this.instructionsPanel = new Panel();
            this.instructionsPanel.Location = new Point(20, 100);
            this.instructionsPanel.Size = new Size(760, 80);
            this.instructionsPanel.BackColor = Color.FromArgb(15, 23, 42);
            this.instructionsPanel.Padding = new Padding(20);

            this.lblInstructions = new Label();
            this.lblInstructions.Text = "Configure your GridHealth Agent with your license key and preferred scan frequency. The agent will automatically collect system health data and send it to the GridHealth monitoring service.";
            this.lblInstructions.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            this.lblInstructions.ForeColor = Color.FromArgb(203, 213, 225); // Slate-300
            this.lblInstructions.AutoSize = false;
            this.lblInstructions.Size = new Size(720, 40);
            this.lblInstructions.TextAlign = ContentAlignment.MiddleLeft;
            this.instructionsPanel.Controls.Add(this.lblInstructions);

            // Configuration Panel
            this.configPanel = new Panel();
            this.configPanel.Location = new Point(20, 200);
            this.configPanel.Size = new Size(760, 200);
            this.configPanel.BackColor = Color.FromArgb(15, 23, 42);
            this.configPanel.Padding = new Padding(20);

            // License Key
            this.lblLicenseKey = new Label();
            this.lblLicenseKey.Text = "License Key:";
            this.lblLicenseKey.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.lblLicenseKey.ForeColor = Color.FromArgb(203, 213, 225); // Slate-300
            this.lblLicenseKey.AutoSize = true;
            this.lblLicenseKey.Location = new Point(20, 20);
            this.configPanel.Controls.Add(this.lblLicenseKey);

            this.txtLicenseKey = new TextBox();
            this.txtLicenseKey.Location = new Point(20, 45);
            this.txtLicenseKey.Size = new Size(450, 36);
            this.txtLicenseKey.Font = new Font("Segoe UI", 11F, FontStyle.Regular);
            this.txtLicenseKey.BackColor = Color.FromArgb(30, 41, 62);
            this.txtLicenseKey.ForeColor = Color.White;
            this.txtLicenseKey.BorderStyle = BorderStyle.FixedSingle;
            this.txtLicenseKey.PlaceholderText = "Enter your GridHealth license key";
            this.configPanel.Controls.Add(this.txtLicenseKey);

            // Scan Frequency
            this.lblScanFrequency = new Label();
            this.lblScanFrequency.Text = "Scan Frequency:";
            this.lblScanFrequency.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.lblScanFrequency.ForeColor = Color.FromArgb(203, 213, 225); // Slate-300
            this.lblScanFrequency.AutoSize = true;
            this.lblScanFrequency.Location = new Point(20, 95);
            this.configPanel.Controls.Add(this.lblScanFrequency);

            this.cboScanFrequency = new ComboBox();
            this.cboScanFrequency.Location = new Point(20, 120);
            this.cboScanFrequency.Size = new Size(200, 36);
            this.cboScanFrequency.Font = new Font("Segoe UI", 11F, FontStyle.Regular);
            this.cboScanFrequency.BackColor = Color.FromArgb(30, 41, 62);
            this.cboScanFrequency.ForeColor = Color.White;
            this.cboScanFrequency.DropDownStyle = ComboBoxStyle.DropDownList;
            this.cboScanFrequency.Items.AddRange(new object[] { "Daily", "Weekly", "Monthly" });
            this.cboScanFrequency.SelectedIndex = 0;
            this.configPanel.Controls.Add(this.cboScanFrequency);

            // API Endpoint (Read-only)
            this.lblApiEndpoint = new Label();
            this.lblApiEndpoint.Text = "API Endpoint:";
            this.lblApiEndpoint.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
            this.lblApiEndpoint.ForeColor = Color.FromArgb(203, 213, 225); // Slate-300
            this.lblApiEndpoint.AutoSize = true;
            this.lblApiEndpoint.Location = new Point(500, 20);
            this.configPanel.Controls.Add(this.lblApiEndpoint);

            this.txtApiEndpoint = new TextBox();
            this.txtApiEndpoint.Location = new Point(500, 45);
            this.txtApiEndpoint.Size = new Size(240, 36);
            this.txtApiEndpoint.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            this.txtApiEndpoint.BackColor = Color.FromArgb(20, 30, 50);
            this.txtApiEndpoint.ForeColor = Color.FromArgb(156, 163, 175); // Gray-400
            this.txtApiEndpoint.BorderStyle = BorderStyle.FixedSingle;
            this.txtApiEndpoint.ReadOnly = true;
            this.txtApiEndpoint.Text = "https://gridhealth.arwindpianist.store";
            this.configPanel.Controls.Add(this.txtApiEndpoint);

            // IT Team Note
            this.lblItNote = new Label();
            this.lblItNote.Text = "Note: IT team should whitelist this domain for firewall access";
            this.lblItNote.Font = new Font("Segoe UI", 9F, FontStyle.Italic);
            this.lblItNote.ForeColor = Color.FromArgb(251, 191, 36); // Amber-400
            this.lblItNote.AutoSize = true;
            this.lblItNote.Location = new Point(500, 85);
            this.configPanel.Controls.Add(this.lblItNote);

            // Configuration Buttons
            this.btnSaveConfig = new Button();
            this.btnSaveConfig.Text = "Save Configuration";
            this.btnSaveConfig.Location = new Point(20, 160);
            this.btnSaveConfig.Size = new Size(190, 45);
            this.btnSaveConfig.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            this.btnSaveConfig.BackColor = Color.FromArgb(34, 197, 94); // Green-500
            this.btnSaveConfig.ForeColor = Color.White;
            this.btnSaveConfig.FlatStyle = FlatStyle.Flat;
            this.btnSaveConfig.FlatAppearance.BorderSize = 0;
            this.btnSaveConfig.Cursor = Cursors.Hand;
            this.btnSaveConfig.Click += new EventHandler(this.BtnSaveConfig_Click);
            this.configPanel.Controls.Add(this.btnSaveConfig);

            this.btnResetConfig = new Button();
            this.btnResetConfig.Text = "Reset to Defaults";
            this.btnResetConfig.Location = new Point(230, 160);
            this.btnResetConfig.Size = new Size(150, 45);
            this.btnResetConfig.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            this.btnResetConfig.BackColor = Color.FromArgb(239, 68, 68); // Red-500
            this.btnResetConfig.ForeColor = Color.White;
            this.btnResetConfig.FlatStyle = FlatStyle.Flat;
            this.btnResetConfig.FlatAppearance.BorderSize = 0;
            this.btnResetConfig.Cursor = Cursors.Hand;
            this.btnResetConfig.Click += new EventHandler(this.BtnResetConfig_Click);
            this.configPanel.Controls.Add(this.btnResetConfig);

            // Status Panel
            this.statusPanel = new Panel();
            this.statusPanel.Location = new Point(20, 420);
            this.statusPanel.Size = new Size(760, 80);
            this.statusPanel.BackColor = Color.FromArgb(15, 23, 42);
            this.statusPanel.Padding = new Padding(20);

            this.lblStatusTitle = new Label();
            this.lblStatusTitle.Text = "Agent Status:";
            this.lblStatusTitle.Font = new Font("Segoe UI", 12F, FontStyle.Bold);
            this.lblStatusTitle.ForeColor = Color.FromArgb(203, 213, 225); // Slate-300
            this.lblStatusTitle.AutoSize = true;
            this.lblStatusTitle.Location = new Point(20, 20);
            this.statusPanel.Controls.Add(this.lblStatusTitle);

            this.lblDeviceId = new Label();
            this.lblDeviceId.Text = "Device ID: Initializing...";
            this.lblDeviceId.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            this.lblDeviceId.ForeColor = Color.FromArgb(156, 163, 175); // Gray-400
            this.lblDeviceId.AutoSize = true;
            this.lblDeviceId.Location = new Point(20, 45);
            this.statusPanel.Controls.Add(this.lblDeviceId);

            // Control Panel
            this.controlPanel = new Panel();
            this.controlPanel.Location = new Point(20, 520);
            this.controlPanel.Size = new Size(760, 60);
            this.controlPanel.BackColor = Color.FromArgb(15, 23, 42);
            this.controlPanel.Padding = new Padding(20);

            this.btnStartMonitoring = new Button();
            this.btnStartMonitoring.Text = "Start Monitoring";
            this.btnStartMonitoring.Location = new Point(20, 10);
            this.btnStartMonitoring.Size = new Size(170, 40);
            this.btnStartMonitoring.Font = new Font("Segoe UI", 11F, FontStyle.Bold);
            this.btnStartMonitoring.BackColor = Color.FromArgb(59, 130, 246); // Blue-500
            this.btnStartMonitoring.ForeColor = Color.White;
            this.btnStartMonitoring.FlatStyle = FlatStyle.Flat;
            this.btnStartMonitoring.FlatAppearance.BorderSize = 0;
            this.btnStartMonitoring.Cursor = Cursors.Hand;
            this.btnStartMonitoring.Click += new EventHandler(this.BtnStartMonitoring_Click);
            this.controlPanel.Controls.Add(this.btnStartMonitoring);

            this.btnServiceStatus = new Button();
            this.btnServiceStatus.Text = "Service Status";
            this.btnServiceStatus.Location = new Point(210, 10);
            this.btnServiceStatus.Size = new Size(140, 40);
            this.btnServiceStatus.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            this.btnServiceStatus.BackColor = Color.FromArgb(245, 158, 11); // Amber-500
            this.btnServiceStatus.ForeColor = Color.White;
            this.btnServiceStatus.FlatStyle = FlatStyle.Flat;
            this.btnServiceStatus.FlatAppearance.BorderSize = 0;
            this.btnServiceStatus.Cursor = Cursors.Hand;
            this.btnServiceStatus.Click += new EventHandler(this.BtnServiceStatus_Click);
            this.controlPanel.Controls.Add(this.btnServiceStatus);

            this.btnManualScan = new Button();
            this.btnManualScan.Text = "Manual Scan";
            this.btnManualScan.Location = new Point(370, 10);
            this.btnManualScan.Size = new Size(140, 40);
            this.btnManualScan.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            this.btnManualScan.BackColor = Color.FromArgb(99, 102, 241); // Indigo-500
            this.btnManualScan.ForeColor = Color.White;
            this.btnManualScan.FlatStyle = FlatStyle.Flat;
            this.btnManualScan.FlatAppearance.BorderSize = 0;
            this.btnManualScan.Cursor = Cursors.Hand;
            this.btnManualScan.Click += new EventHandler(this.BtnManualScan_Click);
            this.controlPanel.Controls.Add(this.btnManualScan);

            this.btnViewLogs = new Button();
            this.btnViewLogs.Text = "View Logs";
            this.btnViewLogs.Location = new Point(520, 10); // Adjusted for better spacing
            this.btnViewLogs.Size = new Size(120, 40);
            this.btnViewLogs.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            this.btnViewLogs.BackColor = Color.FromArgb(107, 114, 128); // Gray-500
            this.btnViewLogs.ForeColor = Color.White;
            this.btnViewLogs.FlatStyle = FlatStyle.Flat;
            this.btnViewLogs.FlatAppearance.BorderSize = 0;
            this.btnViewLogs.Cursor = Cursors.Hand;
            this.btnViewLogs.Click += new EventHandler(this.BtnViewLogs_Click);
            this.controlPanel.Controls.Add(this.btnViewLogs);

            this.btnSettings = new Button();
            this.btnSettings.Text = "Settings";
            this.btnSettings.Location = new Point(660, 10); // Adjusted for better spacing
            this.btnSettings.Size = new Size(120, 40);
            this.btnSettings.Font = new Font("Segoe UI", 10F, FontStyle.Regular);
            this.btnSettings.BackColor = Color.FromArgb(107, 114, 128); // Gray-500
            this.btnSettings.ForeColor = Color.White;
            this.btnSettings.FlatStyle = FlatStyle.Flat;
            this.btnSettings.FlatAppearance.BorderSize = 0;
            this.btnSettings.Cursor = Cursors.Hand;
            this.btnSettings.Click += new EventHandler(this.BtnSettings_Click);
            this.controlPanel.Controls.Add(this.btnSettings);

            // Add panels to form
            this.Controls.Add(this.headerPanel);
            this.Controls.Add(this.instructionsPanel);
            this.Controls.Add(this.configPanel);
            this.Controls.Add(this.statusPanel);
            this.Controls.Add(this.controlPanel);
        }

        #endregion

        // UI Controls
        private Panel headerPanel;
        private Panel instructionsPanel;
        private Panel configPanel;
        private Panel statusPanel;
        private Panel controlPanel;

        private Label lblTitle;
        private Label lblInstructions;
        private Label lblLicenseKey;
        private Label lblScanFrequency;
        private Label lblApiEndpoint;
        private Label lblItNote;
        private Label lblStatusTitle;
        private Label lblDeviceId;

        private TextBox txtLicenseKey;
        private ComboBox cboScanFrequency;
        private TextBox txtApiEndpoint;

        private Button btnSaveConfig;
        private Button btnResetConfig;
        private Button btnStartMonitoring;
        private Button btnServiceStatus;
        private Button btnManualScan;
        private Button btnViewLogs;
        private Button btnSettings;
    }
} 