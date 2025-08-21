@echo off
echo ========================================
echo GridHealth Agent Service Uninstaller
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - OK
) else (
    echo ERROR: This script must be run as Administrator
    echo Right-click on this file and select "Run as administrator"
    pause
    exit /b 1
)

echo.
echo Uninstalling GridHealth Agent Service...
echo.

REM Stop the service first if it's running
echo Stopping service...
sc stop "GridHealthAgent" >nul 2>&1

REM Wait a moment for the service to stop
timeout /t 3 /nobreak >nul

echo Removing service...
sc delete "GridHealthAgent"

if %errorLevel% == 0 (
    echo.
    echo Service uninstalled successfully!
    echo.
    echo The GridHealth Agent service has been removed from Windows.
    echo.
    echo Note: Configuration files are preserved in:
    echo %APPDATA%\GridHealth\
    echo.
    echo To reinstall the service, run install-service.bat
) else (
    echo.
    echo ERROR: Failed to uninstall service.
    echo The service may not have been installed, or there was an error.
    echo.
    echo You can try to remove it manually using:
    echo sc delete GridHealthAgent
)

echo.
pause 