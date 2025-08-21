using System;
using System.ServiceProcess;
using System.Security.Principal;
using Microsoft.Win32;

namespace GridHealth.Agent.Services
{
    public static class ServiceManager
    {
        private const string ServiceName = "GridHealthAgent";

        public static bool IsAdministrator()
        {
            WindowsIdentity identity = WindowsIdentity.GetCurrent();
            WindowsPrincipal principal = new WindowsPrincipal(identity);
            return principal.IsInRole(WindowsBuiltInRole.Administrator);
        }

        public static bool IsServiceInstalled()
        {
            try
            {
                using (ServiceController sc = new ServiceController(ServiceName))
                {
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }

        public static bool InstallService(string executablePath)
        {
            try
            {
                // Use sc.exe to install the service
                var startInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "sc.exe",
                    Arguments = $"create \"{ServiceName}\" binPath= \"{executablePath} --service\" start= auto DisplayName= \"GridHealth Agent Service\"",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                    Verb = "runas" // Request admin privileges
                };

                using (var process = System.Diagnostics.Process.Start(startInfo))
                {
                    process.WaitForExit();
                    return process.ExitCode == 0;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to install service: {ex.Message}");
            }
        }

        public static bool UninstallService()
        {
            if (!IsAdministrator())
            {
                throw new InvalidOperationException("Administrator privileges required to uninstall service");
            }

            try
            {
                // Stop the service first if it's running
                if (IsServiceRunning())
                {
                    StopService();
                }

                // Use sc.exe to delete the service
                var startInfo = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "sc.exe",
                    Arguments = $"delete \"{ServiceName}\"",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                using (var process = System.Diagnostics.Process.Start(startInfo))
                {
                    process.WaitForExit();
                    return process.ExitCode == 0;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to uninstall service: {ex.Message}");
            }
        }

        public static bool StartService()
        {
            try
            {
                using (ServiceController sc = new ServiceController(ServiceName))
                {
                    if (sc.Status == ServiceControllerStatus.Running)
                        return true;

                    sc.Start();
                    sc.WaitForStatus(ServiceControllerStatus.Running, TimeSpan.FromSeconds(30));
                    return sc.Status == ServiceControllerStatus.Running;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to start service: {ex.Message}");
            }
        }

        public static bool StopService()
        {
            try
            {
                using (ServiceController sc = new ServiceController(ServiceName))
                {
                    if (sc.Status == ServiceControllerStatus.Stopped)
                        return true;

                    sc.Stop();
                    sc.WaitForStatus(ServiceControllerStatus.Stopped, TimeSpan.FromSeconds(30));
                    return sc.Status == ServiceControllerStatus.Stopped;
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to stop service: {ex.Message}");
            }
        }

        public static bool IsServiceRunning()
        {
            try
            {
                using (ServiceController sc = new ServiceController(ServiceName))
                {
                    return sc.Status == ServiceControllerStatus.Running;
                }
            }
            catch
            {
                return false;
            }
        }

        public static ServiceControllerStatus GetServiceStatus()
        {
            try
            {
                using (ServiceController sc = new ServiceController(ServiceName))
                {
                    return sc.Status;
                }
            }
            catch
            {
                return ServiceControllerStatus.Stopped;
            }
        }

        public static void SetAutoStart()
        {
            if (!IsAdministrator())
            {
                throw new InvalidOperationException("Administrator privileges required to configure service");
            }

            try
            {
                using (ServiceController sc = new ServiceController(ServiceName))
                {
                    // Set service to start automatically
                    var startInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = "sc.exe",
                        Arguments = $"config \"{ServiceName}\" start= auto",
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        CreateNoWindow = true
                    };

                    using (var process = System.Diagnostics.Process.Start(startInfo))
                    {
                        process.WaitForExit();
                        if (process.ExitCode != 0)
                        {
                            throw new Exception("Failed to set service to auto-start");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to configure service auto-start: {ex.Message}");
            }
        }
    }
} 