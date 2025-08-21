@echo off
setlocal enabledelayedexpansion

echo ========================================
echo GridHealth Agent - Release Builder
echo ========================================
echo.

REM Set version and paths
set "VERSION=1.0.0"
set "RELEASE_DIR=release"
set "PACKAGE_NAME=GridHealth-Agent-v%VERSION%"

echo Building version: %VERSION%
echo Release directory: %RELEASE_DIR%
echo Package name: %PACKAGE_NAME%
echo.

REM Clean previous builds
echo Cleaning previous builds...
if exist "%RELEASE_DIR%" rmdir /s /q "%RELEASE_DIR%"
if exist "bin\Release" rmdir /s /q "bin\Release"
if exist "obj\Release" rmdir /s /q "obj\Release"

REM Build the application
echo Building GridHealth Agent...
dotnet build -c Release

if %errorLevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)

REM Publish self-contained executable
echo Publishing self-contained executable...
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:PublishTrimmed=false -p:PublishReadyToRun=true

if %errorLevel% neq 0 (
    echo ERROR: Publish failed!
    pause
    exit /b 1
)

REM Create release directory structure
echo Creating release package...
mkdir "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%\%PACKAGE_NAME%"

REM Copy application files
echo Copying application files...
copy "bin\Release\net8.0-windows\win-x64\publish\GridHealth.Agent.exe" "%RELEASE_DIR%\%PACKAGE_NAME%\"
if exist "assets" xcopy "assets" "%RELEASE_DIR%\%PACKAGE_NAME%\assets\" /E /I /Y >nul
if exist "schemas" xcopy "schemas" "%RELEASE_DIR%\%PACKAGE_NAME%\schemas\" /E /I /Y >nul

REM Copy installer and documentation
copy "install.bat" "%RELEASE_DIR%\%PACKAGE_NAME%\"
copy "README.md" "%RELEASE_DIR%\%PACKAGE_NAME%\" >nul 2>&1

REM Create README if it doesn't exist
if not exist "README.md" (
    echo Creating README.md...
    echo # GridHealth Agent v%VERSION% > "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo. >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo ## Installation >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo. >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo 1. Right-click on `install.bat` and select "Run as administrator" >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo 2. Follow the installation prompts >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo 3. The agent will start automatically and appear in your system tray >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo 4. Right-click the tray icon to configure your license key and scan frequency >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo. >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo ## System Requirements >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo - Windows 10/11 (64-bit) >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo - .NET 8.0 Runtime (included) >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo - Administrator privileges for installation >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo. >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo ## Features >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo - System tray application (no Windows services) >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo - Automatic startup with Windows >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo - Configurable scan frequency (Daily/Weekly/Monthly) >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo - Real-time health monitoring >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
    echo - Automatic data transmission to GridHealth API >> "%RELEASE_DIR%\%PACKAGE_NAME%\README.md"
)

REM Create ZIP package
echo Creating ZIP package...
cd "%RELEASE_DIR%"
powershell -command "Compress-Archive -Path '%PACKAGE_NAME%' -DestinationPath '%PACKAGE_NAME%.zip' -Force"
cd ..

REM Create checksum
echo Creating checksum...
certutil -hashfile "%RELEASE_DIR%\%PACKAGE_NAME%.zip" SHA256 > "%RELEASE_DIR%\%PACKAGE_NAME%.sha256"

REM Sign the release files
echo Signing release files...
if exist "sign-installer.ps1" (
    powershell -ExecutionPolicy Bypass -File "sign-installer.ps1" -NoInteraction
    if %errorLevel% == 0 (
        echo ✅ Files signed successfully
    ) else (
        echo ⚠️ Code signing failed - package will be unsigned
    )
) else (
    echo ⚠️ Code signing script not found - package will be unsigned
)

echo.
echo ========================================
echo Release Package Created Successfully!
echo ========================================
echo.
echo Package location: %RELEASE_DIR%\%PACKAGE_NAME%.zip
echo Checksum: %RELEASE_DIR%\%PACKAGE_NAME%.sha256
echo.
echo Package contents:
echo - GridHealth.Agent.exe (self-contained executable)
echo - assets/ (application icons and resources)
echo - schemas/ (data schemas)
echo - install.bat (professional installer)
echo - README.md (installation instructions)
echo.
echo The package is ready for distribution!
echo Users can simply:
echo 1. Extract the ZIP file
echo 2. Run install.bat as administrator
echo 3. Configure their license key
echo 4. Start monitoring immediately
echo.
pause 