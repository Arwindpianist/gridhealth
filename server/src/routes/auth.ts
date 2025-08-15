import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';

const router = Router();

// Device authentication
router.post('/device', async (req, res) => {
  try {
    const { deviceId, authKey } = req.body;
    
    if (!deviceId || !authKey) {
      return res.status(400).json({ error: 'Device ID and auth key required' });
    }
    
    // Verify device credentials
    const result = await query(
      'SELECT id, organization_id, name FROM devices WHERE id = $1 AND auth_key = $2',
      [deviceId, authKey]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid device credentials' });
    }
    
    const device = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        deviceId: device.id, 
        organizationId: device.organization_id,
        type: 'device' 
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      device: {
        id: device.id,
        name: device.name,
        organizationId: device.organization_id
      }
    });
    
  } catch (error) {
    console.error('Error authenticating device:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Validate JWT token
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;
    
    res.json({
      valid: true,
      payload: decoded
    });
    
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Middleware to verify JWT token
export function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'default-secret', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

export default router; 