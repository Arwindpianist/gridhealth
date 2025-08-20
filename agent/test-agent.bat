@echo off
echo Testing GridHealth Agent...
echo.

echo Building the agent...
dotnet build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build successful! Running the agent...
echo.

dotnet run

echo.
echo Agent finished running.
pause 