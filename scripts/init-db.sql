-- GridHealth Database Initialization Script

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    primary_contact VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL UNIQUE,
    enrollment_token VARCHAR(128) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    fingerprint VARCHAR(255) NOT NULL UNIQUE,
    auth_key VARCHAR(128) NOT NULL,
    status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
    last_check_in TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create health_metrics table
CREATE TABLE IF NOT EXISTS health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cpu_usage DECIMAL(5,2) NOT NULL CHECK (cpu_usage >= 0 AND cpu_usage <= 100),
    memory_usage DECIMAL(5,2) NOT NULL CHECK (memory_usage >= 0 AND memory_usage <= 100),
    disk_usage DECIMAL(5,2) NOT NULL CHECK (disk_usage >= 0 AND disk_usage <= 100),
    network_bytes_in BIGINT NOT NULL DEFAULT 0,
    network_bytes_out BIGINT NOT NULL DEFAULT 0,
    network_connections INTEGER NOT NULL DEFAULT 0,
    uptime BIGINT NOT NULL DEFAULT 0,
    software_list JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_enrollment_token ON organizations(enrollment_token);
CREATE INDEX IF NOT EXISTS idx_devices_organization_id ON devices(organization_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON devices(fingerprint);
CREATE INDEX IF NOT EXISTS idx_health_metrics_device_id ON health_metrics(device_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_timestamp ON health_metrics(timestamp);

-- Insert sample organization for testing
INSERT INTO organizations (name, primary_contact, contact_email, enrollment_token) 
VALUES ('Test Organization', 'John Doe', 'john@testorg.com', 'test-token-12345678901234567890123456789012')
ON CONFLICT (contact_email) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 