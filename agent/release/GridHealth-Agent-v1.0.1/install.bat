@echo off
setlocal enabledelayedexpansion

echo ========================================
echo GridHealth Agent Installer
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - OK
) else (
    echo ERROR: This installer must be run as Administrator
    echo Right-click on this file and select "Run as administrator"
    echo.
    echo This is required to:
    echo - Create program directories
    echo - Set up startup configuration
    echo - Configure system permissions
    pause
    exit /b 1
)

echo.
echo Installing GridHealth Agent...
echo.

REM Set installation paths
set "INSTALL_DIR=%ProgramFiles%\GridHealth\Agent"
set "APPDATA_DIR=%APPDATA%\GridHealth"
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

echo Installation Directory: %INSTALL_DIR%
echo App Data Directory: %APPDATA_DIR%
echo Startup Directory: %STARTUP_DIR%
echo.

REM Create directories
echo Creating directories...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
if not exist "%APPDATA_DIR%" mkdir "%APPDATA_DIR%"
if not exist "%APPDATA_DIR%\logs" mkdir "%APPDATA_DIR%\logs"
if not exist "%APPDATA_DIR%\config" mkdir "%APPDATA_DIR%\config"

REM Copy application files
echo Copying application files...

REM Check if executable is in current directory or subdirectory
if exist "GridHealth.Agent.exe" (
    echo Found executable in current directory
    copy "GridHealth.Agent.exe" "%INSTALL_DIR%\" >nul
) else if exist "GridHealth-Agent-v1.0.0\GridHealth.Agent.exe" (
    echo Found executable in GridHealth-Agent-v1.0.0 subdirectory
    copy "GridHealth-Agent-v1.0.0\GridHealth.Agent.exe" "%INSTALL_DIR%\" >nul
) else (
    echo ERROR: GridHealth.Agent.exe not found
    echo.
    echo Please ensure you have extracted the ZIP file completely.
    echo The executable should be in the same folder as this installer.
    echo.
    echo Current directory: %CD%
    echo Available files:
    dir /b
    echo.
    pause
    exit /b 1
)

if %errorLevel% neq 0 (
    echo ERROR: Failed to copy GridHealth.Agent.exe
    echo Please ensure the executable is in the same directory as this installer
    pause
    exit /b 1
)

REM Copy assets and schemas (check both current directory and subdirectory)
if exist "assets" (
    echo Copying assets from current directory...
    xcopy "assets" "%INSTALL_DIR%\assets\" /E /I /Y >nul
) else if exist "GridHealth-Agent-v1.0.0\assets" (
    echo Copying assets from subdirectory...
    xcopy "GridHealth-Agent-v1.0.0\assets" "%INSTALL_DIR%\assets\" /E /I /Y >nul
) else (
    echo WARNING: Assets folder not found
)

if exist "schemas" (
    echo Copying schemas from current directory...
    xcopy "schemas" "%INSTALL_DIR%\schemas\" /E /I /Y >nul
) else if exist "GridHealth-Agent-v1.0.0\schemas" (
    echo Copying schemas from subdirectory...
    xcopy "GridHealth-Agent-v1.0.0\schemas" "%INSTALL_DIR%\schemas\" /E /I /Y >nul
) else (
    echo WARNING: Schemas folder not found
)

REM Verify files were copied
echo Verifying installation...
if not exist "%INSTALL_DIR%\GridHealth.Agent.exe" (
    echo ERROR: GridHealth.Agent.exe not found in installation directory
    echo Installation failed!
    pause
    exit /b 1
)
echo ✅ Application files verified

REM Create startup shortcut
echo Creating startup shortcut...
set "SHORTCUT_PATH=%STARTUP_DIR%\GridHealth Agent.lnk"
if exist "%SHORTCUT_PATH%" del "%SHORTCUT_PATH%"

REM Create VBS script to create shortcut
set "VBS_SCRIPT=%TEMP%\CreateShortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%SHORTCUT_PATH%" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%INSTALL_DIR%\GridHealth.Agent.exe" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%INSTALL_DIR%" >> "%VBS_SCRIPT%"
echo oLink.Description = "GridHealth Agent - System Health Monitoring" >> "%VBS_SCRIPT%"
echo oLink.IconLocation = "%INSTALL_DIR%\assets\favicon.ico" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%" >nul
del "%VBS_SCRIPT%" >nul

REM Create uninstaller
echo Creating uninstaller...
set "UNINSTALL_BAT=%INSTALL_DIR%\uninstall.bat"
echo @echo off > "%UNINSTALL_BAT%"
echo echo Removing GridHealth Agent... >> "%UNINSTALL_BAT%"
echo echo. >> "%UNINSTALL_BAT%"
echo if exist "%SHORTCUT_PATH%" del "%SHORTCUT_PATH%" >> "%UNINSTALL_BAT%"
echo if exist "%APPDATA_DIR%" rmdir /s /q "%APPDATA_DIR%" >> "%UNINSTALL_BAT%"
echo if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%" >> "%UNINSTALL_BAT%"
echo echo GridHealth Agent has been removed. >> "%UNINSTALL_BAT%"
echo pause >> "%UNINSTALL_BAT%"

REM Set permissions
echo Setting permissions...
icacls "%INSTALL_DIR%" /grant "Users:(OI)(CI)RX" >nul
icacls "%APPDATA_DIR%" /grant "Users:(OI)(CI)F" >nul

REM Create registry entries for uninstall
echo Creating registry entries...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\GridHealthAgent" /v "DisplayName" /t REG_SZ /d "GridHealth Agent" /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\GridHealthAgent" /v "UninstallString" /t REG_SZ /d "%UNINSTALL_BAT%" /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\GridHealthAgent" /v "DisplayIcon" /t REG_SZ /d "%INSTALL_DIR%\assets\favicon.ico" /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\GridHealthAgent" /v "Publisher" /t REG_SZ /d "GridHealth" /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\GridHealthAgent" /v "DisplayVersion" /t REG_SZ /d "1.0.0" /f >nul

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo GridHealth Agent has been installed successfully!
echo.
echo What happens next:
echo - The agent will start automatically when you log in
echo - Look for the GridHealth icon in your system tray
echo - Right-click the tray icon to configure the agent
echo - Enter your license key and scan frequency
echo.
echo Installation details:
echo - Program Files: %INSTALL_DIR%
echo - Configuration: %APPDATA_DIR%
echo - Startup: %STARTUP_DIR%
echo.
echo To uninstall, run: %UNINSTALL_BAT%
echo.
echo Starting GridHealth Agent now...
echo.

REM Verify executable exists before starting
if exist "%INSTALL_DIR%\GridHealth.Agent.exe" (
    echo Starting GridHealth Agent...
    start "" "%INSTALL_DIR%\GridHealth.Agent.exe"
    echo ✅ GridHealth Agent started successfully
) else (
    echo ❌ ERROR: Cannot start GridHealth Agent
    echo The executable was not found at: %INSTALL_DIR%\GridHealth.Agent.exe
    echo.
    echo Please check the installation and try again.
    echo You can manually start the agent from: %INSTALL_DIR%
)

echo.
pause 