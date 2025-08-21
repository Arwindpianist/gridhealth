using System;
using System.Drawing;
using System.Windows.Forms;

namespace GridHealth.Agent.Forms
{
    public partial class ServiceInstallProgressForm : Form
    {
        private ProgressBar progressBar = null!;
        private Label statusLabel = null!;
        private Label titleLabel = null!;

        public ServiceInstallProgressForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.SuspendLayout();

            // Form properties
            this.Text = "GridHealth Agent Setup";
            this.Size = new Size(500, 200);
            this.StartPosition = FormStartPosition.CenterParent;
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(8, 11, 25);
            this.ForeColor = Color.White;

            // Title label
            titleLabel = new Label
            {
                Text = "Setting up GridHealth Agent...",
                Font = new Font("Segoe UI", 16, FontStyle.Bold),
                ForeColor = Color.FromArgb(139, 92, 246), // Purple
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Top,
                Height = 50,
                Padding = new Padding(20, 10, 20, 10)
            };

            // Status label
            statusLabel = new Label
            {
                Text = "Initializing...",
                Font = new Font("Segoe UI", 10),
                ForeColor = Color.FromArgb(203, 213, 225), // Slate-300
                TextAlign = ContentAlignment.MiddleCenter,
                Dock = DockStyle.Top,
                Height = 30,
                Padding = new Padding(20, 5, 20, 5)
            };

            // Progress bar
            progressBar = new ProgressBar
            {
                Style = ProgressBarStyle.Continuous,
                Minimum = 0,
                Maximum = 100,
                Value = 0,
                Dock = DockStyle.Top,
                Height = 20,
                Margin = new Padding(40, 20, 40, 20)
            };

            // Add controls
            this.Controls.Add(progressBar);
            this.Controls.Add(statusLabel);
            this.Controls.Add(titleLabel);

            this.ResumeLayout(false);
        }

        public void UpdateProgress(string status, int percentage)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action<string, int>(UpdateProgress), status, percentage);
                return;
            }

            statusLabel.Text = status;
            progressBar.Value = Math.Min(100, Math.Max(0, percentage));
            
            // Force UI update
            Application.DoEvents();
        }
    }
} 