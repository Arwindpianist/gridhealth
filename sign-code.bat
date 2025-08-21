@echo off
echo ========================================
echo GridHealth Agent Code Signing
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - OK
) else (
    echo ERROR: This must be run as Administrator
    echo Right-click on this file and select "Run as administrator"
    pause
    exit /b 1
)

echo.
echo Running PowerShell code signing script...
echo.

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "sign-installer.ps1"

if %errorLevel% == 0 (
    echo.
    echo ========================================
    echo Code signing completed successfully!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Code signing failed!
    echo ========================================
)

pause 