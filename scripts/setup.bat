@echo off
echo 🚀 Setting up GridHealth project...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% lss 18 (
    echo ❌ Node.js version 18+ is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Check if .NET is installed
dotnet --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ .NET SDK is not installed. Please install .NET 8 SDK first.
    pause
    exit /b 1
)

REM Check .NET version
for /f "tokens=1,2 delims=." %%a in ('dotnet --version') do set DOTNET_VERSION=%%a
if not "%DOTNET_VERSION%"=="8" (
    echo ❌ .NET 8 SDK is required. Current version: 
    dotnet --version
    pause
    exit /b 1
)

echo ✅ .NET version: 
dotnet --version

REM Install all dependencies
echo 📦 Installing all dependencies...
call npm run install:all

REM Create environment files
echo 🔧 Creating environment files...

REM Server .env
if not exist "server\.env" (
    echo # Database Configuration > server\.env
    echo DB_HOST=localhost >> server\.env
    echo DB_PORT=5432 >> server\.env
    echo DB_USERNAME=postgres >> server\.env
    echo DB_PASSWORD=password >> server\.env
    echo DB_NAME=gridhealth >> server\.env
    echo. >> server\.env
    echo # JWT Configuration >> server\.env
    echo JWT_SECRET=dev-secret-key-change-in-production >> server\.env
    echo JWT_EXPIRES_IN=24h >> server\.env
    echo. >> server\.env
    echo # Server Configuration >> server\.env
    echo PORT=3001 >> server\.env
    echo NODE_ENV=development >> server\.env
    echo. >> server\.env
    echo # Redis Configuration >> server\.env
    echo REDIS_HOST=localhost >> server\.env
    echo REDIS_PORT=6379 >> server\.env
    echo ✅ Created server\.env
)

REM Dashboard .env
if not exist "dashboard\.env" (
    echo # API Configuration > dashboard\.env
    echo NEXT_PUBLIC_API_URL=http://localhost:3001 >> dashboard\.env
    echo ✅ Created dashboard\.env
)

REM Build shared package
echo 🔨 Building shared package...
cd shared
call npm run build
cd ..

REM Build C# agent
echo 🔨 Building C# agent...
cd agent
call dotnet restore
call dotnet build
cd ..

echo.
echo 🎉 GridHealth project setup complete!
echo.
echo Next steps:
echo 1. Start PostgreSQL database (or use Docker: docker-compose up postgres)
echo 2. Run 'npm run dev' to start server and dashboard
echo 3. Or start individually:
echo    - Server: npm run dev:server (http://localhost:3001)
echo    - Dashboard: npm run dev:dashboard (http://localhost:3000)
echo 4. For C# agent:
echo    - Build: npm run agent:build
echo    - Run: npm run agent:run
echo    - Test: npm run agent:test
echo.
echo 📚 API will be available at: http://localhost:3001/api
echo 🏥 Health check at: http://localhost:3001/health
echo 🌐 Dashboard will be available at: http://localhost:3000
pause 