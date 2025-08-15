#!/bin/bash

# GridHealth Project Setup Script
echo "🚀 Setting up GridHealth project..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    echo "❌ .NET SDK is not installed. Please install .NET 8 SDK first."
    exit 1
fi

# Check .NET version
DOTNET_VERSION=$(dotnet --version)
if [[ ! "$DOTNET_VERSION" =~ ^8\. ]]; then
    echo "❌ .NET 8 SDK is required. Current version: $DOTNET_VERSION"
    exit 1
fi

echo "✅ .NET version: $DOTNET_VERSION"

# Install all dependencies
echo "📦 Installing all dependencies..."
npm run install:all

# Create environment files
echo "🔧 Creating environment files..."

# Server .env
if [ ! -f "server/.env" ]; then
    cat > server/.env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=gridhealth

# JWT Configuration
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
EOF
    echo "✅ Created server/.env"
fi

# Dashboard .env
if [ ! -f "dashboard/.env" ]; then
    cat > dashboard/.env << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
    echo "✅ Created dashboard/.env"
fi

# Build shared package
echo "🔨 Building shared package..."
cd shared
npm run build
cd ..

# Build C# agent
echo "🔨 Building C# agent..."
cd agent
dotnet restore
dotnet build
cd ..

echo ""
echo "🎉 GridHealth project setup complete!"
echo ""
echo "Next steps:"
echo "1. Start PostgreSQL database (or use Docker: docker-compose up postgres)"
echo "2. Run 'npm run dev' to start server and dashboard"
echo "3. Or start individually:"
echo "   - Server: npm run dev:server (http://localhost:3001)"
echo "   - Dashboard: npm run dev:dashboard (http://localhost:3000)"
echo "4. For C# agent:"
echo "   - Build: npm run agent:build"
echo "   - Run: npm run agent:run"
echo "   - Test: npm run agent:test"
echo ""
echo "📚 API will be available at: http://localhost:3001/api"
echo "🏥 Health check at: http://localhost:3001/health"
echo "🌐 Dashboard will be available at: http://localhost:3000" 