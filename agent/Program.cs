using System;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using GridHealth.Agent.Forms;
using GridHealth.Agent.Services;

namespace GridHealth.Agent
{
    static class Program
    {
        [STAThread]
        static async Task Main(string[] args)
        {
            try
            {
                Console.WriteLine("🎯 GridHealth Agent starting...");
                
                // Check if running as service
                if (args.Contains("--service"))
                {
                    await RunAsService(args);
                }
                else
                {
                    await RunAsGui(args);
                }
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

        static async Task RunAsService(string[] args)
        {
            try
            {
                Console.WriteLine("🚀 Starting GridHealth Agent as Windows Service...");
                
                var host = Host.CreateDefaultBuilder(args)
                    .UseWindowsService(options =>
                    {
                        options.ServiceName = "GridHealthAgent";
                    })
                    .ConfigureServices((hostContext, services) =>
                    {
                        // Add the background service
                        services.AddHostedService<GridHealthBackgroundService>();
                        
                        // Add other services
                        services.AddSingleton<IConfigurationManager, ConfigurationManager>();
                        services.AddSingleton<IHealthCollectorService, HealthCollectorService>();
                        services.AddSingleton<IApiClientService, ApiClientService>();
                    })
                    .ConfigureLogging((hostContext, logging) =>
                    {
                        logging.ClearProviders();
                        logging.AddEventLog(settings =>
                        {
                            settings.SourceName = "GridHealthAgent";
                        });
                        logging.AddFile("logs/gridhealth-agent-{Date}.txt");
                    })
                    .Build();

                await host.RunAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error running as service: {ex.Message}");
                throw;
            }
        }

        static async Task RunAsGui(string[] args)
        {
            try
            {
                Console.WriteLine("🚀 Starting GridHealth Agent as GUI application...");
                
                // Set up Windows Forms application
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                
                Console.WriteLine("✅ Windows Forms initialized");
                
                // Create and run the main form
                var mainForm = new MainForm();
                Console.WriteLine("✅ MainForm created successfully");
                
                Console.WriteLine("🚀 Launching GridHealth Agent GUI...");
                Application.Run(mainForm);
                
                Console.WriteLine("✅ Application completed successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error running as GUI: {ex.Message}");
                throw;
            }
        }
    }
} 