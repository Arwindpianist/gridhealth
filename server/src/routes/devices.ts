import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// Get all devices
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM devices ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get devices by organization
router.get('/organization/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const result = await query('SELECT * FROM devices WHERE organization_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get device by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM devices WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Update device status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || !['online', 'offline', 'error'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const result = await query(
      'UPDATE devices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating device status:', error);
    res.status(500).json({ error: 'Failed to update device status' });
  }
});

export default router; 