@echo off
echo Resetting GridHealth Agent Configuration...
echo.

REM Stop the service if running
echo Stopping GridHealth Agent service...
sc stop "GridHealth Agent" >nul 2>&1
sc delete "GridHealth Agent" >nul 2>&1

REM Remove configuration files
echo Removing configuration files...
if exist "%APPDATA%\GridHealth" (
    echo Removing %APPDATA%\GridHealth...
    rmdir /s /q "%APPDATA%\GridHealth" >nul 2>&1
)

if exist "%LOCALAPPDATA%\GridHealth" (
    echo Removing %LOCALAPPDATA%\GridHealth...
    rmdir /s /q "%LOCALAPPDATA%\GridHealth" >nul 2>&1
)

REM Remove from Program Files
if exist "C:\Program Files\GridHealth" (
    echo Removing C:\Program Files\GridHealth...
    rmdir /s /q "C:\Program Files\GridHealth" >nul 2>&1
)

REM Remove start menu shortcuts
if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\GridHealth" (
    echo Removing start menu shortcuts...
    rmdir /s /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\GridHealth" >nul 2>&1
)

echo.
echo Configuration reset complete!
echo.
echo Next steps:
echo 1. Run install.bat as Administrator to reinstall
echo 2. When the agent starts, enter your license key: ADMIN-UNLIMITED-749fdd88-cbcc-414b-b679-0b313af45c25
echo 3. The agent should now work correctly
echo.
pause 