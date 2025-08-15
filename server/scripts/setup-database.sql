-- GridHealth Database Setup Script
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Clerk Integration)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Companies (System Integrators) Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  subscription_tier VARCHAR(50) DEFAULT 'basic',
  max_organizations INTEGER DEFAULT 10,
  max_devices INTEGER DEFAULT 1000,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  device_limit INTEGER DEFAULT 50,
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  organization_id UUID REFERENCES organizations(id),
  role VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_role_scope CHECK (
    (company_id IS NOT NULL AND organization_id IS NULL) OR
    (company_id IS NULL AND organization_id IS NOT NULL) OR
    (company_id IS NULL AND organization_id IS NULL AND role = 'admin')
  )
);

-- 5. Devices Table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  device_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  last_seen TIMESTAMP,
  agent_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Health Metrics Table
CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  metric_type VARCHAR(100) NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 7. Licenses Table
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  license_key VARCHAR(255) UNIQUE NOT NULL,
  device_limit INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_organization_id ON devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_device_timestamp ON health_metrics(device_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_health_metrics_type ON health_metrics(metric_type);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (clerk_user_id = auth.jwt() ->> 'sub');

-- RLS Policies for Companies
CREATE POLICY "Admins can view all companies" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      JOIN user_roles ur ON u.id = ur.user_id 
      WHERE ur.role = 'admin' AND u.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Company owners can view own company" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.company_id = companies.id 
      AND ur.role = 'owner'
      AND ur.user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

-- RLS Policies for Organizations
CREATE POLICY "Admins can view all organizations" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      JOIN user_roles ur ON u.id = ur.user_id 
      WHERE ur.role = 'admin' AND u.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Company users can view company organizations" ON organizations
  FOR SELECT USING (
    company_id IN (
      SELECT ur.company_id FROM user_roles ur 
      WHERE ur.user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Organization users can view own organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT ur.organization_id FROM user_roles ur 
      WHERE ur.user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

-- RLS Policies for User Roles
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "Admins can view all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      JOIN user_roles ur ON u.id = ur.user_id 
      WHERE ur.role = 'admin' AND u.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

-- RLS Policies for Devices
CREATE POLICY "Admins can view all devices" ON devices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u 
      JOIN user_roles ur ON u.id = ur.user_id 
      WHERE ur.role = 'admin' AND u.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

CREATE POLICY "Organization users can view organization devices" ON devices
  FOR SELECT USING (
    organization_id IN (
      SELECT ur.organization_id FROM user_roles ur 
      WHERE ur.user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Company users can view managed organization devices" ON devices
  FOR SELECT USING (
    organization_id IN (
      SELECT o.id FROM organizations o 
      WHERE o.company_id IN (
        SELECT ur.company_id FROM user_roles ur 
        WHERE ur.user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
      )
    )
  );

-- RLS Policies for Health Metrics
CREATE POLICY "Users can view metrics for accessible devices" ON health_metrics
  FOR SELECT USING (
    device_id IN (
      SELECT d.id FROM devices d
      WHERE d.organization_id IN (
        SELECT ur.organization_id FROM user_roles ur 
        WHERE ur.user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
      )
    )
  );

-- RLS Policies for Licenses
CREATE POLICY "Users can view licenses for accessible organizations" ON licenses
  FOR SELECT USING (
    organization_id IN (
      SELECT ur.organization_id FROM user_roles ur 
      WHERE ur.user_id = (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

-- Insert default admin user (you'll need to update this with your Clerk user ID)
-- INSERT INTO users (clerk_user_id, email, first_name, last_name, role) 
-- VALUES ('your-clerk-user-id', 'admin@gridhealth.com', 'Admin', 'User');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated; 