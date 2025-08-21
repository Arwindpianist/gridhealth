@echo off
echo ========================================
echo GridHealth Agent Service Installer
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
echo Installing GridHealth Agent Service...
echo.

REM Get the directory where this batch file is located
set "SCRIPT_DIR=%~dp0"
set "EXE_PATH=%SCRIPT_DIR%bin\Debug\net8.0-windows\win-x64\GridHealth.Agent.exe"

REM Check if the executable exists
if not exist "%EXE_PATH%" (
    echo ERROR: GridHealth.Agent.exe not found at:
    echo %EXE_PATH%
    echo.
    echo Please build the project first using: dotnet build
    pause
    exit /b 1
)

echo Found executable at: %EXE_PATH%
echo.

REM Install the service
echo Installing service...
sc create "GridHealthAgent" binPath= "%EXE_PATH% --service" start= auto DisplayName= "GridHealth Agent Service"

if %errorLevel% == 0 (
    echo.
    echo Service installed successfully!
    echo.
    echo Starting service...
    sc start "GridHealthAgent"
    
    if %errorLevel% == 0 (
        echo.
        echo Service started successfully!
        echo.
        echo GridHealth Agent is now running as a Windows Service.
        echo It will automatically start with Windows.
        echo.
        echo You can manage the service through:
        echo - Windows Services (services.msc)
        echo - Task Manager > Services tab
        echo - Command line: sc query GridHealthAgent
        echo.
        echo To stop the service: sc stop GridHealthAgent
        echo To remove the service: sc delete GridHealthAgent
    ) else (
        echo.
        echo WARNING: Service installed but failed to start.
        echo You may need to start it manually through Windows Services.
    )
) else (
    echo.
    echo ERROR: Failed to install service.
    echo Please check the error message above.
)

echo.
pause 