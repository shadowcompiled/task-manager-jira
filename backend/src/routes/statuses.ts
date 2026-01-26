import express, { Response } from 'express';
import db from '../database';
import { authenticateToken, AuthRequest } from '../middleware';

const router = express.Router();

// Get all statuses for a restaurant
router.get('/restaurant/:restaurantId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const statuses = db
      .prepare(
        `SELECT id, name, display_name, color, order_index FROM statuses 
         WHERE restaurant_id = ? 
         ORDER BY order_index ASC`
      )
      .all(restaurantId);
    res.json(statuses);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new status (admin/maintainer only)
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId, name, displayName, color } = req.body;
    
    // Check if user is admin or maintainer
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user?.id) as any;
    if (!['admin', 'maintainer'].includes(user?.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can create statuses' });
    }

    // Get the highest order_index
    const maxOrder = db
      .prepare('SELECT MAX(order_index) as max_order FROM statuses WHERE restaurant_id = ?')
      .get(restaurantId) as any;
    const orderIndex = (maxOrder?.max_order ?? -1) + 1;

    const result = db
      .prepare(
        `INSERT INTO statuses (restaurant_id, name, display_name, color, order_index)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(restaurantId, name, displayName, color || '#808080', orderIndex);

    res.json({ id: result.lastInsertRowid, name, displayName, color: color || '#808080', orderIndex });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Status name already exists for this restaurant' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update a status (admin/maintainer only)
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { displayName, color } = req.body;

    // Check if user is admin or maintainer
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user?.id) as any;
    if (!['admin', 'maintainer'].includes(user?.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can update statuses' });
    }

    db.prepare(
      `UPDATE statuses SET display_name = ?, color = ? WHERE id = ?`
    ).run(displayName, color, id);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a status (admin/maintainer only)
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is admin or maintainer
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user?.id) as any;
    if (!['admin', 'maintainer'].includes(user?.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can delete statuses' });
    }

    // Check if status is being used
    const count = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = (SELECT name FROM statuses WHERE id = ?)').get(id) as any;
    if (count.count > 0) {
      return res.status(400).json({ error: 'Cannot delete status that has tasks' });
    }

    db.prepare('DELETE FROM statuses WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reorder statuses
router.post('/reorder', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { statuses } = req.body;

    // Check if user is admin or maintainer
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.user?.id) as any;
    if (!['admin', 'maintainer'].includes(user?.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can reorder statuses' });
    }

    statuses.forEach((status: any, index: number) => {
      db.prepare('UPDATE statuses SET order_index = ? WHERE id = ?').run(index, status.id);
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
