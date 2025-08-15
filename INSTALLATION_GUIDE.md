# GridHealth Installation Guide

## 🎯 **Overview**
GridHealth is a comprehensive IoT health monitoring system with three main components:
- **Server**: Express.js API with SQLite database
- **Dashboard**: Next.js web interface
- **Agent**: C# .NET monitoring agent

## 🚨 **Important Note: vSphere Compatibility**
**If you're running VMware vSphere on your system, DO NOT use Docker Desktop** - it will conflict with VMware's virtualization. This guide uses SQLite instead.

---

## 📋 **Prerequisites**

### **Required Software**
- [x] **Node.js 18+** - For server and dashboard
- [x] **.NET 8 SDK** - For C# agent
- [x] **Git** - For version control

### **Optional Software**
- [ ] **Docker Desktop** - Only if NOT running vSphere
- [ ] **PostgreSQL** - Only if NOT using SQLite

---

## 🚀 **Quick Start (SQLite - No Docker)**

### **Step 1: Clone Repository**
```bash
git clone <repository-url>
cd gridhealth
```

### **Step 2: Install Dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install dashboard dependencies
cd ../dashboard
npm install

# Install shared dependencies
cd ../shared
npm install
```

### **Step 3: Start Services**
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start dashboard
cd dashboard
npm run dev

# Terminal 3: Build agent (optional)
cd agent
dotnet build
```

### **Step 4: Access Applications**
- **Dashboard**: http://localhost:3000
- **API Server**: http://localhost:3001
- **Database**: SQLite file at `server/data/gridhealth.db`

---

## 🔧 **Detailed Installation**

### **1. Node.js Installation**
```bash
# Windows (using winget)
winget install OpenJS.NodeJS

# Verify installation
node --version
npm --version
```

### **2. .NET 8 SDK Installation**
```bash
# Windows (using winget)
winget install Microsoft.DotNet.SDK.8

# Verify installation (restart terminal first)
dotnet --version
```

### **3. Project Setup**
```bash
# Clone repository
git clone <repository-url>
cd gridhealth

# Install all dependencies
npm install
cd server && npm install
cd ../dashboard && npm install
cd ../shared && npm install
```

---

## 🗄️ **Database Configuration**

### **SQLite (Default - No Conflicts)**
- **File**: `server/data/gridhealth.db`
- **Created**: Automatically on first run
- **Tables**: Organizations, Devices, Health Metrics, Users
- **Benefits**: No virtualization, no port conflicts, simple setup

### **PostgreSQL (Alternative)**
If you prefer PostgreSQL and don't have vSphere conflicts:
```bash
# Install PostgreSQL locally
# Update server/src/config/database.ts
# Update environment variables
```

---

## 🌐 **Environment Configuration**

### **Server Environment**
Create `server/.env`:
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
```

### **Dashboard Environment**
Create `dashboard/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 🚀 **Running the Application**

### **Development Mode**
```bash
# Terminal 1: API Server
cd server
npm run dev

# Terminal 2: Dashboard
cd dashboard
npm run dev

# Terminal 3: Agent (optional)
cd agent
dotnet run
```

### **Production Mode**
```bash
# Build all components
npm run build

# Start production server
cd server
npm start

# Start production dashboard
cd dashboard
npm start
```

---

## 🧪 **Testing & Verification**

### **Health Checks**
```bash
# Test API server
curl http://localhost:3001/health

# Test database connection
curl http://localhost:3001/api/organizations

# Check dashboard
open http://localhost:3000
```

### **Database Verification**
```bash
# Check SQLite database
cd server
sqlite3 data/gridhealth.db ".tables"
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Port Already in Use**
```bash
# Check what's using the port
netstat -ano | findstr :3001
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <process-id> /F
```

#### **2. .NET Command Not Found**
- **Solution**: Restart terminal after .NET installation
- **Verify**: `dotnet --version`

#### **3. Database Connection Errors**
- **SQLite**: Check file permissions in `server/data/`
- **PostgreSQL**: Verify service is running and credentials

#### **4. vSphere Conflicts**
- **Problem**: Docker Desktop clashes with VMware
- **Solution**: Use SQLite instead (this guide)
- **Alternative**: Install PostgreSQL locally

---

## 📚 **Project Structure**
```
gridhealth/
├── server/          # Express.js API + SQLite
├── dashboard/       # Next.js web interface
├── agent/          # C# .NET monitoring agent
├── shared/         # Shared schemas and types
└── scripts/        # Database and setup scripts
```

---

## 🔄 **Migration from Docker**

If you were previously using Docker:
1. **Stop Docker containers**: `docker-compose down`
2. **Follow SQLite setup**: Use this guide
3. **Data migration**: Export from PostgreSQL, import to SQLite

---

## 📞 **Support**

### **Getting Help**
- Check the troubleshooting section above
- Review server logs for error messages
- Verify all dependencies are installed

### **Next Steps**
- Set up monitoring devices
- Configure health metrics
- Customize dashboard views
- Deploy to production environment

---

## ✅ **Installation Checklist**

- [ ] **Install Node.js 18+**
- [ ] **Install .NET 8 SDK**
- [ ] **Clone repository**
- [ ] **Install server dependencies**
- [ ] **Install dashboard dependencies**
- [ ] **Configure environment files**
- [ ] **Start API server**
- [ ] **Start dashboard**
- [ ] **Test database connection**
- [ ] **Verify all services running**

---

*Last Updated: $(date)*
*Version: 2.0 - SQLite Edition* 