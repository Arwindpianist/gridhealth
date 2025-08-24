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
copy "GridHealth.Agent.exe" "C:\Program Files\GridHealth\" >nul
copy "*.dll" "C:\Program Files\GridHealth\" >nul 2>&1

REM Create start menu shortcut
echo Creating start menu shortcut...
if not exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\GridHealth" mkdir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\GridHealth"
echo @echo off > "%APPDATA%\Microsoft\Windows\Start Menu\Programs\GridHealth\GridHealth Agent.lnk"
echo "C:\Program Files\GridHealth\GridHealth.Agent.exe" >> "%APPDATA%\Microsoft\Windows\Start Menu\Programs\GridHealth\GridHealth Agent.lnk"

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