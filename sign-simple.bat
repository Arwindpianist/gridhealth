@echo off
echo ========================================
echo GridHealth Agent - Simple Code Signing
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
echo Current directory: %CD%
echo.

REM Check if signing script exists
if exist "sign-installer.ps1" (
    echo Found signing script: sign-installer.ps1
    echo.
    echo Starting code signing process...
    echo.
    
    REM Run PowerShell with explicit path
    powershell -ExecutionPolicy Bypass -Command "& '.\sign-installer.ps1'"
    
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
) else (
    echo ERROR: sign-installer.ps1 not found!
    echo.
    echo Available files in current directory:
    dir *.ps1
    echo.
    echo Please ensure you're running this from the agent directory.
    pause
    exit /b 1
)

echo.
pause 