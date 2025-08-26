@echo off
echo GridHealth Agent Diagnostic Tool
echo ================================
echo.

echo Checking Windows Service Status...
sc query "GridHealth Agent" >nul 2>&1
if %errorLevel% == 0 (
    echo ✓ GridHealth Agent service exists
    sc query "GridHealth Agent" | findstr "STATE"
) else (
    echo ✗ GridHealth Agent service not found
)
echo.

echo Checking Program Files Installation...
if exist "C:\Program Files\GridHealth\GridHealth.Agent.exe" (
    echo ✓ Agent executable found in Program Files
    dir "C:\Program Files\GridHealth\GridHealth.Agent.exe" | findstr "GridHealth.Agent.exe"
) else (
    echo ✗ Agent executable NOT found in Program Files
)
echo.

echo Checking Configuration Files...
if exist "%APPDATA%\GridHealth" (
    echo ✓ Configuration directory found: %APPDATA%\GridHealth
    dir "%APPDATA%\GridHealth" /b
) else (
    echo ✗ Configuration directory not found
)
echo.

echo Checking Running Processes...
tasklist | findstr "GridHealth.Agent.exe" >nul 2>&1
if %errorLevel% == 0 (
    echo ✓ GridHealth.Agent.exe is running
    tasklist | findstr "GridHealth.Agent.exe"
) else (
    echo ✗ GridHealth.Agent.exe is not running
)
echo.

echo Testing Network Connectivity...
echo Testing connection to gridhealth.arwindpianist.store...
ping -n 1 gridhealth.arwindpianist.store >nul 2>&1
if %errorLevel% == 0 (
    echo ✓ Network connectivity OK
) else (
    echo ✗ Network connectivity failed
)
echo.

echo Testing License API...
echo Testing license validation endpoint...
curl -s -X POST https://gridhealth.arwindpianist.store/api/licenses/validate -H "Content-Type: application/json" -d "{\"license_key\":\"ADMIN-UNLIMITED-749fdd88-cbcc-414b-b679-0b313af45c25\",\"action\":\"validate\",\"timestamp\":\"2024-01-01T00:00:00Z\"}" | findstr "isValid"
if %errorLevel% == 0 (
    echo ✓ License API is responding
) else (
    echo ✗ License API test failed
)
echo.

echo Diagnostic complete!
echo.
echo If you see any ✗ marks above, those indicate issues that need to be resolved.
echo.
pause 