using System;
using System.Windows.Forms;

namespace GridHealth.Agent
{
    public class TestForm : Form
    {
        public TestForm()
        {
            this.Text = "GridHealth Test Form";
            this.Size = new System.Drawing.Size(400, 300);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = System.Drawing.Color.White;
            
            var label = new Label
            {
                Text = "GridHealth Agent Test Form\n\nIf you can see this, the GUI is working!",
                Dock = DockStyle.Fill,
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new System.Drawing.Font("Arial", 14)
            };
            
            this.Controls.Add(label);
            
            // Force visibility
            this.Visible = true;
            this.ShowInTaskbar = true;
            this.WindowState = FormWindowState.Normal;
            this.BringToFront();
            this.Focus();
            
            Console.WriteLine("TestForm created and should be visible");
        }
    }
} 