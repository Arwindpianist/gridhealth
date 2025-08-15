using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.Json;
using Microsoft.Extensions.Configuration.EnvironmentVariables;
using Microsoft.Extensions.Configuration.CommandLine;
using GridHealth.Agent.Services;
using GridHealth.Agent.Models;

namespace GridHealth.Agent;

static class Program
{
    static Program()
    {
        // Static constructor to test if the class loads
        Console.WriteLine("🔧 Program class loaded!");
    }

    static async Task Main(string[] args)
    {
        try
        {
            Console.WriteLine("🎯 GridHealth Agent starting...");
            Console.WriteLine($"📝 Arguments: {string.Join(", ", args)}");
            Console.WriteLine($"🔍 Contains --console: {args.Contains("--console")}");
            Console.WriteLine($"🔍 Contains /console: {args.Contains("/console")}");
            
            // Force console output to flush
            Console.Out.Flush();
            
            // Check if running as service or console
            if (args.Contains("--console") || args.Contains("/console"))
            {
                Console.WriteLine("🖥️  Running in CONSOLE mode");
                // Console mode for development and testing
                await RunAsConsole(args);
            }
            else
            {
                Console.WriteLine("🔄 Running in SERVICE mode");
                // Service mode for production
                await RunAsService(args);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ CRITICAL ERROR in Main: {ex.Message}");
            Console.WriteLine($"📋 Exception details: {ex}");
        }
        finally
        {
            Console.WriteLine("🏁 Main method completed.");
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
    }

    private static async Task RunAsConsole(string[] args)
    {
        Console.WriteLine("GridHealth Agent - Console Mode");
        Console.WriteLine("Starting in console mode for development...");
        Console.WriteLine($"Arguments received: {string.Join(", ", args)}");
        
        var host = CreateHostBuilder(args).Build();
        
        try
        {
            Console.WriteLine("Host built successfully, getting agent service...");
            
            // Start the agent service
            var agentService = host.Services.GetRequiredService<IAgentService>();
            Console.WriteLine("Agent service retrieved, starting...");
            
            await agentService.StartAsync(CancellationToken.None);
            
            Console.WriteLine("Agent service started. Press any key to exit...");
            Console.ReadKey();
            
            await agentService.StopAsync(CancellationToken.None);
            Console.WriteLine("Agent service stopped.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to start GridHealth Agent: {ex.Message}");
            Console.WriteLine($"Exception details: {ex}");
            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
    }

    private static async Task RunAsService(string[] args)
    {
        try
        {
            var host = CreateHostBuilder(args).Build();
            await host.RunAsync();
        }
        catch (Exception ex)
        {
            // Log error to Windows Event Log
            var logger = LoggerFactory.Create(builder => builder.AddEventLog())
                .CreateLogger("GridHealth.Agent");
            logger.LogError(ex, "Failed to start GridHealth Agent service");
            throw;
        }
    }

    private static IHostBuilder CreateHostBuilder(string[] args) =>
        Host.CreateDefaultBuilder(args)
            .UseWindowsService(options =>
            {
                options.ServiceName = "GridHealth Agent";
            })
            .ConfigureServices((context, services) =>
            {
                // Configuration
                services.Configure<AgentConfiguration>(
                    context.Configuration.GetSection("Agent"));

                // Core Services
                services.AddSingleton<IAgentService, AgentService>();
                services.AddSingleton<IMonitoringService, MonitoringService>();
                services.AddSingleton<IEnrollmentService, EnrollmentService>();
                services.AddSingleton<IHealthCollectorService, HealthCollectorService>();
                services.AddSingleton<IApiClientService, ApiClientService>();
                services.AddSingleton<GridHealth.Agent.Services.IConfigurationManager, GridHealth.Agent.Services.ConfigurationManager>();
                services.AddSingleton<IHealthScanner, HealthScanner>();

                // HTTP client
                services.AddHttpClient();

                // Logging
                services.AddLogging(builder =>
                {
                    builder.AddConsole();
                    builder.AddEventLog();
                });
            })
            .ConfigureAppConfiguration((context, config) =>
            {
                config.SetBasePath(Directory.GetCurrentDirectory());
                config.AddJsonFile("appsettings.json", optional: true);
                config.AddJsonFile($"appsettings.{context.HostingEnvironment.EnvironmentName}.json", optional: true);
                config.AddEnvironmentVariables();
                config.AddCommandLine(args);
            });
} 