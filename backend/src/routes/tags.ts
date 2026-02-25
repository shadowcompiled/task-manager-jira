import express, { Response } from 'express';
import { sql } from '../database';
import { AuthRequest, authenticateToken } from '../middleware';

const router = express.Router();

router.get('/restaurant/:restaurantId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId;
    if (Number(restaurantId) !== req.user?.restaurantId) {
      return res.status(403).json({ error: 'Access denied to this restaurant' });
    }
    const { rows } = await sql`
      SELECT id, name, color, color2, created_by FROM tags
      WHERE restaurant_id = ${restaurantId}
      ORDER BY name ASC
    `;
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/task/:taskId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.taskId;
    const restaurantId = req.user?.restaurantId;
    const { rows } = await sql`
      SELECT t.id, t.name, t.color, t.color2 FROM tags t
      JOIN task_tags tt ON t.id = tt.tag_id
      JOIN tasks tk ON tk.id = tt.task_id
      WHERE tt.task_id = ${taskId} AND tk.restaurant_id = ${restaurantId}
      ORDER BY t.name ASC
    `;
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId, name, color, color2 } = req.body;
    const userRestaurantId = req.user?.restaurantId;
    if (Number(restaurantId) !== userRestaurantId) {
      return res.status(403).json({ error: 'Cannot create tags for another restaurant' });
    }
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (user?.role !== 'admin' && user?.role !== 'maintainer') {
      return res.status(403).json({ error: 'Only maintainers and admins can create tags' });
    }
    const existing = await sql`SELECT id FROM tags WHERE restaurant_id = ${restaurantId} AND name = ${name}`;
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Tag already exists' });
    }
    const result = await sql`
      INSERT INTO tags (restaurant_id, name, color, color2, created_by)
      VALUES (${restaurantId}, ${name}, ${color || '#808080'}, ${color2 ?? null}, ${req.user?.id})
      RETURNING id, name, color, color2, created_by
    `;
    const row = result.rows[0] as any;
    res.json({ id: row.id, name, color: color || '#808080', color2: color2 ?? null, created_by: req.user?.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { name, color, color2 } = req.body;
    const restaurantId = req.user?.restaurantId;
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (user?.role !== 'admin' && user?.role !== 'maintainer') {
      return res.status(403).json({ error: 'Only maintainers and admins can update tags' });
    }
    const tagRows = await sql`SELECT id FROM tags WHERE id = ${id} AND restaurant_id = ${restaurantId}`;
    if (tagRows.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    await sql`UPDATE tags SET name = ${name}, color = ${color}, color2 = ${color2 ?? null} WHERE id = ${id} AND restaurant_id = ${restaurantId}`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const restaurantId = req.user?.restaurantId;
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (user?.role !== 'admin' && user?.role !== 'maintainer') {
      return res.status(403).json({ error: 'Only maintainers and admins can delete tags' });
    }
    const tagRows = await sql`SELECT id FROM tags WHERE id = ${id} AND restaurant_id = ${restaurantId}`;
    if (tagRows.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    await sql`DELETE FROM tags WHERE id = ${id} AND restaurant_id = ${restaurantId}`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:tagId/task/:taskId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { tagId, taskId } = req.params;
    const restaurantId = req.user?.restaurantId;
    const taskCheck = await sql`SELECT id FROM tasks WHERE id = ${taskId} AND restaurant_id = ${restaurantId}`;
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const tagCheck = await sql`SELECT id FROM tags WHERE id = ${tagId} AND restaurant_id = ${restaurantId}`;
    if (tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    await sql`INSERT INTO task_tags (task_id, tag_id) VALUES (${taskId}, ${tagId}) ON CONFLICT (task_id, tag_id) DO NOTHING`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:tagId/task/:taskId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { tagId, taskId } = req.params;
    const restaurantId = req.user?.restaurantId;
    const taskCheck = await sql`SELECT id FROM tasks WHERE id = ${taskId} AND restaurant_id = ${restaurantId}`;
    if (taskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await sql`DELETE FROM task_tags WHERE task_id = ${taskId} AND tag_id = ${tagId}`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
