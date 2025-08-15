# GridHealth - Enterprise System Health Monitoring

GridHealth is a comprehensive system health monitoring solution designed for deployment across large organizations. It provides real-time monitoring, customizable alerts, and mass deployment capabilities.

## 🏗️ Architecture

GridHealth is built as a monorepo with the following components:

- **Server** (`/server`) - Express.js API with PostgreSQL database
- **Dashboard** (`/dashboard`) - Next.js admin interface
- **Agent** (`/agent`) - C# .NET 8 Windows desktop application
- **Shared** (`/shared`) - JSON Schema files and utilities

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm 9+ (for server and dashboard)
- **.NET 8 SDK** (for C# agent)
- **PostgreSQL 12+** (database)
- **Windows 10/11** (for agent development and testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gridhealth
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Server
   cp server/.env.example server/.env
   
   # Dashboard
   cp dashboard/.env.example dashboard/.env
   ```

4. **Start development servers**
   ```bash
   # Start server and dashboard
   npm run dev
   
   # Or start individually
   npm run dev:server    # API on http://localhost:3001
   npm run dev:dashboard # Dashboard on http://localhost:3000
   ```

5. **Build and run C# agent**
   ```bash
   # Build agent
   npm run agent:build
   
   # Run agent
   npm run agent:run
   
   # Run tests
   npm run agent:test
   ```

## 📁 Project Structure

```
gridhealth/
├── server/                 # Express.js API
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── models/        # Data models
│   │   └── config/        # Configuration
│   └── package.json
├── dashboard/              # Next.js admin interface
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   └── components/    # React components
│   └── package.json
├── agent/                  # C# .NET 8 Windows agent
│   ├── Services/          # Core services
│   ├── Models/            # Data models
│   ├── Forms/             # Windows Forms UI
│   ├── Utils/             # Utilities
│   └── GridHealth.Agent.csproj
├── shared/                 # Shared schemas and utilities
│   ├── schemas/           # JSON Schema files
│   ├── src/               # TypeScript utilities
│   └── package.json
└── package.json            # Root workspace config
```

## 🔧 Configuration

### Server Configuration

The server requires the following environment variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=gridhealth

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=development
```

### Dashboard Configuration

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Agent Configuration

The C# agent uses `appsettings.json`:

```json
{
  "Agent": {
    "ApiUrl": "http://localhost:3001",
    "OrganizationId": "",
    "DeviceId": "",
    "AuthKey": "",
    "MonitoringInterval": "00:15:00",
    "LogLevel": "Information"
  }
}
```

## 🚀 Deployment

### Production Build

```bash
# Build all packages
npm run build

# Start production servers
npm run start:server
npm run start:dashboard
```

### Agent Packaging

```bash
# Build for Windows
cd agent
dotnet publish -c Release -r win-x64 --self-contained true

# Create installer (requires WiX Toolset)
# This creates a Windows installer in agent/bin/Release/net8.0-windows/win-x64/publish/
```

## 📊 Features

### Organization Management
- Create and manage organizations
- Generate enrollment tokens
- Customize monitoring schedules
- Set alert configurations

### Device Monitoring
- Real-time health metrics
- CPU, memory, disk, and network monitoring
- System uptime tracking
- Software inventory

### Mass Deployment
- Windows MSI/EXE installers
- Silent installation support
- Intune, GPO, SCCM compatibility
- Automated enrollment

### Alerting
- Email notifications
- Webhook integration
- Dashboard alerts
- Customizable thresholds

## 🔒 Security

- TLS encryption for all communications
- JWT-based authentication
- Secure token-based enrollment
- Device-level authentication keys
- Role-based access control

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests for specific package
npm run test:server
npm run test:dashboard
npm run test:shared

# C# agent tests
npm run agent:test
```

## 📝 API Documentation

Once the server is running, API documentation is available at:
- **Health Check**: `http://localhost:3001/health`
- **API Base**: `http://localhost:3001/api`

## 🔧 Development

### C# Agent Development

```bash
cd agent

# Build
dotnet build

# Run
dotnet run

# Test
dotnet test

# Clean
dotnet clean
```

### Silent Installation

The agent supports silent installation with organization token:

```cmd
GridHealthAgent.exe ORGTOKEN=abc123 /quiet
```

### Memory Optimization

The agent is designed to use ≤50MB RAM when idle, achieved through:
- Efficient memory management
- Background service architecture
- Minimal UI footprint
- Optimized data collection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the API health endpoint

---

**GridHealth** - Enterprise-grade system monitoring made simple. 