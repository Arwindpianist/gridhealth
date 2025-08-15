import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// Get all organizations
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM organizations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Get organization by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('SELECT * FROM organizations WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Create new organization
router.post('/', async (req, res) => {
  try {
    const { name, primaryContact, contactEmail } = req.body;
    
    if (!name || !primaryContact || !contactEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await query(
      'INSERT INTO organizations (name, primary_contact, contact_email, enrollment_token) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, primaryContact, contactEmail, generateEnrollmentToken()]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Update organization
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, primaryContact, contactEmail } = req.body;
    
    const result = await query(
      'UPDATE organizations SET name = $1, primary_contact = $2, contact_email = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
      [name, primaryContact, contactEmail, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Delete organization
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM organizations WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

function generateEnrollmentToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default router; 