import express, { Response } from 'express';
import db from '../database';
import { authenticateToken, AuthRequest } from '../middleware';

const router = express.Router();

// Get all tags for a restaurant
router.get('/restaurant/:restaurantId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId } = req.params;
    const tags = db
      .prepare(
        `SELECT id, name, color, color2, created_by FROM tags 
         WHERE restaurant_id = ? 
         ORDER BY name ASC`
      )
      .all(restaurantId);
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get tags for a specific task
router.get('/task/:taskId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const tags = db
      .prepare(
        `SELECT t.id, t.name, t.color, t.color2 FROM tags t
         JOIN task_tags tt ON t.id = tt.tag_id
         WHERE tt.task_id = ?
         ORDER BY t.name ASC`
      )
      .all(taskId);
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new tag (maintainers and admins only)
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId, name, color, color2 } = req.body;

    // Check if user is maintainer or admin
    const user = db
      .prepare('SELECT role FROM users WHERE id = ?')
      .get(req.user?.id) as any;
    if (user?.role !== 'admin' && user?.role !== 'maintainer') {
      return res
        .status(403)
        .json({ error: 'רק מנהלים יכולים ליצור תגיות' });
    }

    // Check if tag name already exists for this restaurant
    const existing = db
      .prepare('SELECT id FROM tags WHERE restaurant_id = ? AND name = ?')
      .get(restaurantId, name);
    if (existing) {
      return res.status(400).json({ error: 'תגית בשם זה כבר קיימת' });
    }

    const result = db
      .prepare(
        `INSERT INTO tags (restaurant_id, name, color, color2, created_by)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(restaurantId, name, color || '#808080', color2 || null, req.user?.id);

    res.json({
      id: result.lastInsertRowid,
      name,
      color: color || '#808080',
      color2: color2 || null,
      created_by: req.user?.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a tag (managers and admins only)
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, color, color2 } = req.body;

    // Check if user is maintainer or admin
    const user = db
      .prepare('SELECT role FROM users WHERE id = ?')
      .get(req.user?.id) as any;
    if (user?.role !== 'admin' && user?.role !== 'maintainer') {
      return res
        .status(403)
        .json({ error: 'רק מנהלים יכולים לעדכן תגיות' });
    }

    db.prepare(`UPDATE tags SET name = ?, color = ?, color2 = ? WHERE id = ?`).run(
      name,
      color,
      color2 || null,
      id
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a tag (managers and admins only)
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user is maintainer or admin
    const user = db
      .prepare('SELECT role FROM users WHERE id = ?')
      .get(req.user?.id) as any;
    if (user?.role !== 'admin' && user?.role !== 'maintainer') {
      return res
        .status(403)
        .json({ error: 'Only maintainers and admins can delete tags' });
    }

    db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add tag to task
router.post('/:tagId/task/:taskId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { tagId, taskId } = req.params;

    // Check if already tagged
    const existing = db
      .prepare('SELECT id FROM task_tags WHERE task_id = ? AND tag_id = ?')
      .get(taskId, tagId);
    if (existing) {
      return res.status(400).json({ error: 'Task already has this tag' });
    }

    db.prepare(`INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)`).run(
      taskId,
      tagId
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove tag from task
router.delete('/:tagId/task/:taskId', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { tagId, taskId } = req.params;

    db.prepare(`DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?`).run(
      taskId,
      tagId
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
