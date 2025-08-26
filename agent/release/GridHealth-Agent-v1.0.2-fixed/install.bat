@echo off
echo Installing GridHealth Agent v1.0.2...
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as administrator - proceeding with installation
) else (
    echo This installer requires administrator privileges.
    echo Please right-click and "Run as administrator"
    pause
    exit /b 1
)

REM Stop existing service if running
echo Stopping existing GridHealth Agent service...
sc stop "GridHealth Agent" >nul 2>&1
sc delete "GridHealth Agent" >nul 2>&1

REM Copy files to Program Files
echo Installing to Program Files...
if not exist "C:\Program Files\GridHealth" mkdir "C:\Program Files\GridHealth"

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
echo Script directory: %SCRIPT_DIR%

REM Copy the executable and DLLs
echo Copying GridHealth.Agent.exe...
copy "%SCRIPT_DIR%GridHealth.Agent.exe" "C:\Program Files\GridHealth\" >nul
if %errorLevel% neq 0 (
    echo ERROR: Failed to copy GridHealth.Agent.exe
    echo Please ensure the installer is run from the directory containing the agent files
    pause
    exit /b 1
)

echo Copying DLL files...
copy "%SCRIPT_DIR%*.dll" "C:\Program Files\GridHealth\" >nul 2>&1
if %errorLevel% neq 0 (
    echo WARNING: Some DLL files may not have been copied
)

REM Verify installation
echo.
echo Verifying installation...
if exist "C:\Program Files\GridHealth\GridHealth.Agent.exe" (
    echo ✓ GridHealth.Agent.exe copied successfully
) else (
    echo ✗ ERROR: GridHealth.Agent.exe was not copied!
    echo Please check the script directory and run as administrator
    pause
    exit /b 1
)

echo ✓ Installation verified successfully

REM Create start menu shortcut
echo Creating start menu shortcut...
if not exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\GridHealth" mkdir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\GridHealth"

REM Create a proper shortcut using PowerShell
echo Creating shortcut using PowerShell...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\GridHealth\GridHealth Agent.lnk'); $Shortcut.TargetPath = 'C:\Program Files\GridHealth\GridHealth.Agent.exe'; $Shortcut.WorkingDirectory = 'C:\Program Files\GridHealth\'; $Shortcut.Save()"

echo.
echo Installation completed successfully!
echo.
echo The GridHealth Agent has been installed to:
echo C:\Program Files\GridHealth\
echo.
echo You can now run the agent from the Start Menu or by double-clicking:
echo C:\Program Files\GridHealth\GridHealth.Agent.exe
echo.
echo Note: The agent will need to be configured with your license key on first run.
echo.
pause 