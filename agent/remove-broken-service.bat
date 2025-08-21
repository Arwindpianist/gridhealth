@echo off
echo ========================================
echo GridHealth Agent Service Cleanup
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
echo Removing broken GridHealthAgent service...
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
    echo Service removed successfully!
    echo.
    echo You can now run the GridHealth Agent GUI again
    echo to install the service with the correct configuration.
) else (
    echo.
    echo ERROR: Failed to remove service.
    echo The service may not exist or there was an error.
)

echo.
pause 