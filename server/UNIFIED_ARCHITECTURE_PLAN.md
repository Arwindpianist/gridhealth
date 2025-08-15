# GridHealth Unified Architecture Plan
## Single Domain Deployment: gridhealth.arwindpianist.store

### 🎯 **Vision**
Transform `gridhealth.arwindpianist.store` into a unified platform that serves as:
- **Landing Page** - Marketing and product information
- **Backend API** - Agent data reception and database management
- **Dashboard** - Multi-tenant management interface
- **Agent Portal** - Device enrollment and configuration

---

## 🏗️ **Architecture Overview**

### **Single Vercel Deployment Structure**
```
gridhealth.arwindpianist.store/
├── /                    # Landing page (marketing)
├── /api                 # Backend API endpoints
│   ├── /health         # Health check
│   ├── /enrollment     # Device enrollment
│   ├── /metrics        # Health data reception
│   ├── /organizations  # Organization management
│   ├── /companies      # Company (SI) management
│   └── /auth           # Authentication
├── /dashboard          # Multi-tenant dashboard
│   ├── /admin          # Central admin (your access)
│   ├── /company        # Company/SI dashboard
│   └── /org            # Organization dashboard
└── /agent              # Agent configuration portal
```

---

## 🔧 **Technical Implementation**

### **1. Framework Selection**
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Vercel** for hosting and serverless functions
- **Supabase** for database (PostgreSQL)
- **Tailwind CSS** for styling

### **2. API Routes Structure**
```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: 'healthy', timestamp: new Date().toISOString() })
}

// app/api/enrollment/route.ts
export async function POST(request: Request) {
  // Handle device enrollment
}

// app/api/metrics/route.ts
export async function POST(request: Request) {
  // Receive health data from agents
}
```

### **3. Database Schema (Supabase)**
```sql
-- Companies (System Integrators)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  max_devices INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Organizations (under Companies)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  device_limit INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Devices
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  device_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Health Metrics
CREATE TABLE health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id),
  metric_type VARCHAR(100) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎨 **Frontend Structure**

### **1. Landing Page (/app/page.tsx)**
- Hero section with GridHealth value proposition
- Features overview
- Pricing information
- Contact/sales information
- Login/register buttons

### **2. Dashboard Layout (/app/dashboard/layout.tsx)**
- Sidebar navigation
- User authentication
- Role-based access control
- Responsive design

### **3. Dashboard Pages**
```typescript
// Central Admin Dashboard
/app/dashboard/admin/page.tsx
- Company onboarding management
- System-wide statistics
- License management
- Revenue tracking

// Company Dashboard
/app/dashboard/company/page.tsx
- Organization management
- Device limits and usage
- Billing and subscription
- Performance analytics

// Organization Dashboard
/app/dashboard/org/page.tsx
- Device monitoring
- Health metrics visualization
- Alert management
- Reports and insights
```

---

## 🔌 **Agent Integration**

### **1. Agent Configuration Update**
Update the agent's `appsettings.json`:
```json
{
  "Agent": {
    "ApiEndpoint": "https://gridhealth.arwindpianist.store/api",
    "EnrollmentEndpoint": "https://gridhealth.arwindpianist.store/api/enrollment",
    "MetricsEndpoint": "https://gridhealth.arwindpianist.store/api/metrics"
  }
}
```

### **2. API Endpoints for Agents**
```typescript
// POST /api/enrollment
{
  "organizationToken": "string",
  "deviceId": "string",
  "deviceName": "string",
  "deviceType": "string"
}

// POST /api/metrics
{
  "deviceId": "string",
  "organizationId": "string",
  "timestamp": "ISO8601",
  "metrics": {
    "cpu": { "usage": 45.2, "unit": "%" },
    "memory": { "usage": 67.8, "unit": "%" },
    "disk": { "usage": 23.1, "unit": "%" }
  }
}
```

---

## 🚀 **Deployment Strategy**

### **1. Vercel Configuration**
```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "SUPABASE_URL": "your-supabase-url",
    "SUPABASE_ANON_KEY": "your-supabase-anon-key",
    "SUPABASE_SERVICE_KEY": "your-supabase-service-key"
  }
}
```

### **2. Environment Variables**
```bash
# .env.local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=your-stripe-secret
```

---

## 📊 **Data Flow**

### **1. Agent → API → Database**
```
Agent (C#) → POST /api/metrics → Supabase → Real-time Dashboard
```

### **2. Dashboard → Database**
```
Dashboard → Supabase → Real-time Updates → UI Components
```

### **3. Real-time Features**
- **Supabase Realtime** for live dashboard updates
- **WebSocket fallback** for critical notifications
- **Server-sent events** for health alerts

---

## 🔐 **Security & Authentication**

### **1. Row-Level Security (RLS)**
```sql
-- Example: Users can only see their organization's data
CREATE POLICY "Users can only access their organization data"
ON health_metrics
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);
```

### **2. JWT Authentication**
- Supabase Auth for user management
- Custom JWT tokens for agent authentication
- Role-based access control

---

## 💰 **Licensing & Billing**

### **1. Subscription Model**
- **MYR11/year per device**
- **Stripe integration** for payments
- **Usage tracking** and limits
- **Automatic billing** cycles

### **2. Billing Implementation**
```typescript
// app/api/billing/create-subscription/route.ts
export async function POST(request: Request) {
  // Create Stripe subscription
  // Update company device limits
  // Send confirmation email
}
```

---

## 📈 **Performance & Scaling**

### **1. Vercel Edge Functions**
- **Global CDN** for fast access
- **Serverless functions** for API endpoints
- **Automatic scaling** based on demand

### **2. Database Optimization**
- **Connection pooling** for Supabase
- **Indexed queries** for fast data retrieval
- **Data archiving** for old metrics

---

## 🧪 **Testing Strategy**

### **1. Development Testing**
- **Local Supabase** instance
- **Agent simulation** with mock data
- **Dashboard testing** with sample organizations

### **2. Production Testing**
- **Staging environment** on Vercel
- **Real agent deployment** testing
- **Load testing** for multiple organizations

---

## 📅 **Implementation Timeline**

### **Phase 1: Foundation (Week 1-2)**
- [ ] Set up Next.js project structure
- [ ] Configure Supabase database
- [ ] Create basic API endpoints
- [ ] Implement authentication

### **Phase 2: Core Features (Week 3-4)**
- [ ] Landing page design
- [ ] Dashboard layout and navigation
- [ ] Agent enrollment system
- [ ] Health metrics reception

### **Phase 3: Advanced Features (Week 5-6)**
- [ ] Multi-tenant dashboards
- [ ] Real-time updates
- [ ] Billing integration
- [ ] Advanced analytics

### **Phase 4: Production (Week 7-8)**
- [ ] Vercel deployment
- [ ] Domain configuration
- [ ] Agent integration testing
- [ ] Go-live preparation

---

## 🎯 **Success Metrics**

### **1. Technical Metrics**
- **API response time** < 200ms
- **Dashboard load time** < 2s
- **99.9% uptime** target
- **Real-time data latency** < 1s

### **2. Business Metrics**
- **Agent enrollment success rate** > 95%
- **Data transmission reliability** > 99%
- **User onboarding completion** > 80%
- **Customer satisfaction** > 4.5/5

---

## 🚨 **Risk Mitigation**

### **1. Technical Risks**
- **Database scaling** - Implement connection pooling
- **Real-time performance** - Use Supabase Realtime + WebSocket fallback
- **API rate limiting** - Implement proper throttling

### **2. Business Risks**
- **Data security** - Implement RLS and encryption
- **Compliance** - GDPR and data protection measures
- **Scalability** - Design for 1000+ organizations

---

## 🔄 **Next Steps**

1. **Review and approve** this architecture plan
2. **Set up Next.js project** in server directory
3. **Configure Supabase** database
4. **Create initial API endpoints**
5. **Design dashboard wireframes**
6. **Begin implementation**

---

*This document will be updated as the implementation progresses.* 