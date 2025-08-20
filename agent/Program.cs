using System;
using System.Windows.Forms;
using GridHealth.Agent.Forms;

namespace GridHealth.Agent
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                Console.WriteLine("🎯 GridHealth Agent starting...");
                
                // Set up Windows Forms application
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                
                Console.WriteLine("🚀 Windows Forms initialized");
                
                // Create and run the main form
                var mainForm = new MainForm();
                Console.WriteLine("✅ MainForm created successfully");
                
                Console.WriteLine("🚀 Launching GridHealth Agent GUI...");
                Application.Run(mainForm);
                
                Console.WriteLine("✅ Application completed successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ERROR: {ex.Message}");
                Console.WriteLine($"Exception details: {ex}");
                
                try
                {
                    MessageBox.Show($"Error: {ex.Message}", "GridHealth Agent Error", 
                        MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                catch
                {
                    // If even the error message box fails, just exit
                }
            }
        }
    }
} 