import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// Submit health metrics
router.post('/', async (req, res) => {
  try {
    const { deviceId, cpu, memory, disk, network, uptime, software } = req.body;
    
    if (!deviceId || !cpu || !memory || !disk || !network || uptime === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await query(
      `INSERT INTO health_metrics 
       (device_id, cpu_usage, memory_usage, disk_usage, network_bytes_in, network_bytes_out, network_connections, uptime, software_list)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        deviceId,
        cpu.usage,
        memory.usage,
        disk.usage,
        network.bytesIn,
        network.bytesOut,
        network.connections,
        uptime,
        software ? JSON.stringify(software) : null
      ]
    );
    
    res.status(201).json(result.rows[0]);
    
  } catch (error) {
    console.error('Error submitting metrics:', error);
    res.status(500).json({ error: 'Failed to submit metrics' });
  }
});

// Get metrics for a device
router.get('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 100 } = req.query;
    
    const result = await query(
      'SELECT * FROM health_metrics WHERE device_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [deviceId, limit]
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get latest metrics for all devices in an organization
router.get('/organization/:orgId/latest', async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const result = await query(
      `SELECT DISTINCT ON (d.id) 
       d.id as device_id, d.name as device_name, hm.*
       FROM devices d
       LEFT JOIN health_metrics hm ON d.id = hm.device_id
       WHERE d.organization_id = $1
       ORDER BY d.id, hm.timestamp DESC`,
      [orgId]
    );
    
    res.json(result.rows);
    
  } catch (error) {
    console.error('Error fetching organization metrics:', error);
    res.status(500).json({ error: 'Failed to fetch organization metrics' });
  }
});

export default router; 