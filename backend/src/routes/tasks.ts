import express, { Response } from 'express';
import { sql } from '../database';
import { AuthRequest, authenticateToken, authorize } from '../middleware';
import { sendAssignmentNotification } from '../services/emailService';

const router = express.Router();

router.get('/team/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const { rows } = await sql`SELECT id, name, email, role FROM users WHERE restaurant_id = ${restaurantId} ORDER BY name ASC`;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const status = req.query.status as string;
    const assigned = req.query.assigned_to as string;

    const { rows } = await sql`
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.restaurant_id = ${restaurantId}
      ORDER BY t.due_date ASC NULLS LAST
    `;
    let tasks = rows as any[];
    if (status) tasks = tasks.filter((t: any) => t.status === status);
    if (assigned) tasks = tasks.filter((t: any) => t.assigned_to === parseInt(assigned));
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const restaurantId = req.user?.restaurantId;
    const taskRows = await sql`
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = ${taskId} AND t.restaurant_id = ${restaurantId}
    `;
    const task = taskRows.rows[0] as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const [checklistsRes, commentsRes, photosRes] = await Promise.all([
      sql`SELECT * FROM task_checklists WHERE task_id = ${task.id}`,
      sql`SELECT c.*, u.name as user_name FROM comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ${task.id} ORDER BY c.created_at DESC`,
      sql`SELECT * FROM photos WHERE task_id = ${task.id} ORDER BY uploaded_at DESC`
    ]);
    res.json({
      ...task,
      checklists: checklistsRes.rows,
      comments: commentsRes.rows,
      photos: photosRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

router.post('/', authenticateToken, authorize(['admin', 'maintainer']), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, assigned_to, priority, due_date, recurrence } = req.body;
    const restaurantId = req.user?.restaurantId;
    const createdBy = req.user?.id;
    const status = assigned_to ? 'assigned' : 'planned';

    const result = await sql`
      INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, due_date, recurrence, created_by)
      VALUES (${title}, ${description ?? null}, ${assigned_to ?? null}, ${restaurantId}, ${priority || 'medium'}, ${status}, ${due_date ?? null}, ${recurrence || 'once'}, ${createdBy})
      RETURNING *
    `;
    const task = result.rows[0] as any;
    if (assigned_to) {
      await sql`INSERT INTO task_assignments (task_id, user_id) VALUES (${task.id}, ${assigned_to}) ON CONFLICT (task_id, user_id) DO NOTHING`;
    }
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const { title, description, assigned_to, priority, status, due_date, estimated_time, tags } = req.body;
    const restaurantId = req.user?.restaurantId;

    const taskRows = await sql`SELECT * FROM tasks WHERE id = ${taskId} AND restaurant_id = ${restaurantId}`;
    const task = taskRows.rows[0] as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const isManager = ['admin', 'maintainer'].includes(req.user?.role || '');
    const isAssignedToTask = task.assigned_to === req.user?.id;
    if (!isManager && !isAssignedToTask) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const newStatus = status || task.status;
    const oldStatus = task.status;
    if (newStatus !== oldStatus) {
      await sql`
        INSERT INTO task_status_history (task_id, old_status, new_status, changed_by)
        VALUES (${taskId}, ${oldStatus}, ${newStatus}, ${req.user?.id})
      `;
    }

    let assignedUser: any = null;
    if (assigned_to !== undefined && assigned_to !== task.assigned_to) {
      const u = await sql`SELECT id, email, name FROM users WHERE id = ${assigned_to}`;
      assignedUser = u.rows[0] as any;
    }

    await sql`
      UPDATE tasks
      SET title = ${title ?? task.title}, description = ${description !== undefined ? description : task.description},
          assigned_to = ${assigned_to !== undefined ? assigned_to : task.assigned_to},
          priority = ${priority || task.priority}, status = ${newStatus},
          due_date = ${due_date !== undefined ? due_date : task.due_date},
          estimated_time = ${estimated_time !== undefined ? estimated_time : task.estimated_time},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${taskId}
    `;

    if (assigned_to !== undefined) {
      await sql`DELETE FROM task_assignments WHERE task_id = ${taskId}`;
      if (assigned_to) {
        await sql`INSERT INTO task_assignments (task_id, user_id) VALUES (${taskId}, ${assigned_to}) ON CONFLICT (task_id, user_id) DO NOTHING`;
      }
    }

    if (assignedUser?.email) {
      const [restaurantRows, creatorRows] = await Promise.all([
        sql`SELECT name FROM restaurants WHERE id = ${restaurantId}`,
        sql`SELECT name FROM users WHERE id = ${req.user?.id}`
      ]);
      const restaurantName = (restaurantRows.rows[0] as any)?.name || 'Restaurant';
      const createdByName = (creatorRows.rows[0] as any)?.name || 'Unknown';
      sendAssignmentNotification(assignedUser.email, title || task.title, createdByName, restaurantName).catch((err: any) => console.error('Failed to send email:', err));
    }

    if (tags && Array.isArray(tags)) {
      await sql`DELETE FROM task_tags WHERE task_id = ${taskId}`;
      for (const tagId of tags) {
        await sql`INSERT INTO task_tags (task_id, tag_id) VALUES (${taskId}, ${tagId}) ON CONFLICT (task_id, tag_id) DO NOTHING`;
      }
    }

    const updatedRows = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
    res.json(updatedRows.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.put('/:id/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user?.id;
    const taskRows = await sql`SELECT * FROM tasks WHERE id = ${taskId} AND assigned_to = ${userId}`;
    const task = taskRows.rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await sql`UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ${taskId}`;
    const updatedRows = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
    res.json(updatedRows.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

router.put('/:id/verify', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const { comment } = req.body;
    const restaurantId = req.user?.restaurantId;

    const taskRows = await sql`SELECT * FROM tasks WHERE id = ${taskId} AND restaurant_id = ${restaurantId}`;
    const task = taskRows.rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await sql`UPDATE tasks SET status = 'verified', verified_at = CURRENT_TIMESTAMP, verified_by = ${req.user?.id} WHERE id = ${taskId}`;
    if (comment) {
      await sql`INSERT INTO comments (task_id, user_id, content) VALUES (${taskId}, ${req.user?.id}, ${comment})`;
    }
    const updatedRows = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
    res.json(updatedRows.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify task' });
  }
});

router.delete('/:id', authenticateToken, authorize(['admin', 'maintainer']), async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const restaurantId = req.user?.restaurantId;
    const taskRows = await sql`SELECT * FROM tasks WHERE id = ${taskId} AND restaurant_id = ${restaurantId}`;
    const task = taskRows.rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await sql`DELETE FROM tasks WHERE id = ${taskId}`;
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
