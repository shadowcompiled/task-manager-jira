import express, { Response } from 'express';
import { sql } from '../database';
import { AuthRequest, authenticateToken } from '../middleware';

const router = express.Router();

router.get('/restaurant/:restaurantId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId;
    const { rows } = await sql`
      SELECT id, name, display_name, color, order_index FROM statuses
      WHERE restaurant_id = ${restaurantId}
      ORDER BY order_index ASC
    `;
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId, name, displayName, color } = req.body;
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (!['admin', 'maintainer'].includes(user?.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can create statuses' });
    }
    const maxRows = await sql`SELECT MAX(order_index) as max_order FROM statuses WHERE restaurant_id = ${restaurantId}`;
    const maxOrder = (maxRows.rows[0] as any)?.max_order ?? -1;
    const orderIndex = maxOrder + 1;
    const result = await sql`
      INSERT INTO statuses (restaurant_id, name, display_name, color, order_index)
      VALUES (${restaurantId}, ${name}, ${displayName}, ${color || '#808080'}, ${orderIndex})
      RETURNING id, name, display_name, color, order_index
    `;
    const row = result.rows[0] as any;
    res.json({ id: row.id, name, displayName, color: color || '#808080', orderIndex });
  } catch (error: any) {
    if (error.message?.includes('unique') || error.code === '23505') {
      return res.status(400).json({ error: 'Status name already exists for this restaurant' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { displayName, color, name: newName } = req.body;
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (!['admin', 'maintainer'].includes(user?.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can update statuses' });
    }
    const statusRows = await sql`SELECT id, name, display_name, color, restaurant_id FROM statuses WHERE id = ${id}`;
    const existing = statusRows.rows[0] as any;
    if (!existing) return res.status(404).json({ error: 'Status not found' });

    const display_name = displayName !== undefined ? displayName : existing.display_name;
    const color_val = color !== undefined ? color : existing.color;

    if (newName !== undefined && newName !== existing.name) {
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can change status internal name' });
      }
      const normalizedName = String(newName).toLowerCase().replace(/\s+/g, '_');
      await sql`UPDATE statuses SET name = ${normalizedName}, display_name = ${display_name}, color = ${color_val} WHERE id = ${id}`;
      await sql`UPDATE tasks SET status = ${normalizedName} WHERE restaurant_id = ${existing.restaurant_id} AND status = ${existing.name}`;
      return res.json({ success: true, name: normalizedName });
    }

    await sql`UPDATE statuses SET display_name = ${display_name}, color = ${color_val} WHERE id = ${id}`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (!['admin', 'maintainer'].includes(user?.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can delete statuses' });
    }
    const countRows = await sql`SELECT COUNT(*) as count FROM tasks WHERE status = (SELECT name FROM statuses WHERE id = ${id})`;
    const count = (countRows.rows[0] as any)?.count ?? 0;
    if (Number(count) > 0) {
      return res.status(400).json({ error: 'Cannot delete status that has tasks' });
    }
    await sql`DELETE FROM statuses WHERE id = ${id}`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/reorder', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { statuses } = req.body;
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (!['admin', 'maintainer'].includes(user?.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can reorder statuses' });
    }
    for (let i = 0; i < statuses.length; i++) {
      await sql`UPDATE statuses SET order_index = ${i} WHERE id = ${(statuses[i] as any).id}`;
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
