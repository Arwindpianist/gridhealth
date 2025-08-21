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
copy "GridHealth.Agent.exe" "%INSTALL_DIR%\" >nul
if exist "assets" xcopy "assets" "%INSTALL_DIR%\assets\" /E /I /Y >nul
if exist "schemas" xcopy "schemas" "%INSTALL_DIR%\schemas\" /E /I /Y >nul

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

REM Start the application
start "" "%INSTALL_DIR%\GridHealth.Agent.exe"

pause 