import express, { Response } from 'express';
import { sql } from '../database';
import { AuthRequest, authenticateToken } from '../middleware';

const router = express.Router();

router.get('/restaurant/:organizationId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(401).json({ error: 'Unauthorized' });
    const paramId = req.params.organizationId;
    if (String(paramId) !== String(organizationId)) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    const { rows } = await sql`
      SELECT id, name, color, color2, created_by FROM tags
      WHERE organization_id = ${organizationId}
      ORDER BY name ASC
    `;
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/task/:taskId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(401).json({ error: 'Unauthorized' });
    const taskId = req.params.taskId;
    const { rows } = await sql`
      SELECT t.id, t.name, t.color, t.color2 FROM tags t
      JOIN task_tags tt ON t.id = tt.tag_id
      JOIN tasks tk ON tt.task_id = tk.id AND tk.organization_id = ${organizationId}
      WHERE tt.task_id = ${taskId}
      ORDER BY t.name ASC
    `;
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(401).json({ error: 'Unauthorized' });
    const { name, color, color2 } = req.body;
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (user?.role !== 'admin' && user?.role !== 'maintainer') {
      return res.status(403).json({ error: 'Only maintainers and admins can create tags' });
    }
    const existing = await sql`SELECT id FROM tags WHERE organization_id = ${organizationId} AND name = ${name}`;
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Tag already exists' });
    }
    const result = await sql`
      INSERT INTO tags (organization_id, name, color, color2, created_by)
      VALUES (${organizationId}, ${name}, ${color || '#808080'}, ${color2 ?? null}, ${req.user?.id})
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
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(401).json({ error: 'Unauthorized' });
    const { name, color, color2 } = req.body;
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (user?.role !== 'admin' && user?.role !== 'maintainer') {
      return res.status(403).json({ error: 'Only maintainers and admins can update tags' });
    }
    const tagExists = await sql`SELECT id FROM tags WHERE id = ${id} AND organization_id = ${organizationId}`;
    if (tagExists.rows.length === 0) return res.status(404).json({ error: 'Tag not found' });
    await sql`UPDATE tags SET name = ${name}, color = ${color}, color2 = ${color2 ?? null} WHERE id = ${id} AND organization_id = ${organizationId}`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(401).json({ error: 'Unauthorized' });
    const userRows = await sql`SELECT role FROM users WHERE id = ${req.user?.id}`;
    const user = userRows.rows[0] as any;
    if (user?.role !== 'admin' && user?.role !== 'maintainer') {
      return res.status(403).json({ error: 'Only maintainers and admins can delete tags' });
    }
    const tagExists = await sql`SELECT id FROM tags WHERE id = ${id} AND organization_id = ${organizationId}`;
    if (tagExists.rows.length === 0) return res.status(404).json({ error: 'Tag not found' });
    await sql`DELETE FROM tags WHERE id = ${id} AND organization_id = ${organizationId}`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:tagId/task/:taskId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(401).json({ error: 'Unauthorized' });
    const { tagId, taskId } = req.params;
    const taskCheck = await sql`SELECT id FROM tasks WHERE id = ${taskId} AND organization_id = ${organizationId}`;
    const tagCheck = await sql`SELECT id FROM tags WHERE id = ${tagId} AND organization_id = ${organizationId}`;
    if (taskCheck.rows.length === 0 || tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task or tag not found' });
    }
    const existing = await sql`SELECT id FROM task_tags WHERE task_id = ${taskId} AND tag_id = ${tagId}`;
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Task already has this tag' });
    }
    await sql`INSERT INTO task_tags (task_id, tag_id) VALUES (${taskId}, ${tagId}) ON CONFLICT (task_id, tag_id) DO NOTHING`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:tagId/task/:taskId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) return res.status(401).json({ error: 'Unauthorized' });
    const { tagId, taskId } = req.params;
    const taskCheck = await sql`SELECT id FROM tasks WHERE id = ${taskId} AND organization_id = ${organizationId}`;
    const tagCheck = await sql`SELECT id FROM tags WHERE id = ${tagId} AND organization_id = ${organizationId}`;
    if (taskCheck.rows.length === 0 || tagCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Task or tag not found' });
    }
    await sql`DELETE FROM task_tags WHERE task_id = ${taskId} AND tag_id = ${tagId}`;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
