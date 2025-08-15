import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// Device enrollment
router.post('/', async (req, res) => {
  try {
    const { enrollmentToken, deviceFingerprint, deviceName } = req.body;
    
    if (!enrollmentToken || !deviceFingerprint || !deviceName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find organization by enrollment token
    const orgResult = await query(
      'SELECT id FROM organizations WHERE enrollment_token = $1 AND is_active = true',
      [enrollmentToken]
    );
    
    if (orgResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid enrollment token' });
    }
    
    const organizationId = orgResult.rows[0].id;
    
    // Check if device already exists
    const existingDevice = await query(
      'SELECT id FROM devices WHERE fingerprint = $1',
      [deviceFingerprint]
    );
    
    if (existingDevice.rows.length > 0) {
      return res.status(409).json({ error: 'Device already enrolled' });
    }
    
    // Create new device
    const deviceResult = await query(
      'INSERT INTO devices (organization_id, name, fingerprint, auth_key, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [organizationId, deviceName, deviceFingerprint, generateAuthKey(), 'online']
    );
    
    const device = deviceResult.rows[0];
    
    res.status(201).json({
      organizationId: device.organization_id,
      deviceId: device.id,
      authKey: device.auth_key,
      message: 'Device enrolled successfully'
    });
    
  } catch (error) {
    console.error('Error enrolling device:', error);
    res.status(500).json({ error: 'Failed to enroll device' });
  }
});

// Validate enrollment token
router.post('/validate', async (req, res) => {
  try {
    const { enrollmentToken } = req.body;
    
    if (!enrollmentToken) {
      return res.status(400).json({ error: 'Enrollment token required' });
    }
    
    const result = await query(
      'SELECT id, name FROM organizations WHERE enrollment_token = $1 AND is_active = true',
      [enrollmentToken]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ valid: false, error: 'Invalid enrollment token' });
    }
    
    res.json({ 
      valid: true, 
      organization: result.rows[0] 
    });
    
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

function generateAuthKey(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default router; 