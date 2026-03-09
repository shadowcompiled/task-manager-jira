import express, { Response } from 'express';
import { sql } from '../database';
import { AuthRequest, authenticateToken, authorize } from '../middleware';
import { sendAssignmentNotification, isEmailConfigured } from '../services/emailService';
import { sendNotificationToUser } from '../services/pushService';

const router = express.Router();

router.get('/team/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { rows } = await sql`SELECT id, name, email, role FROM users WHERE organization_id = ${organizationId} ORDER BY name ASC`;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

/** Check if assignment email is configured (EMAIL_USER + EMAIL_PASSWORD set). Use to verify Vercel env. */
router.get('/email-config', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ emailConfigured: isEmailConfigured() });
});

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const status = req.query.status as string;
    const assigned = req.query.assigned_to as string;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString();

    const { rows } = await sql`
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.organization_id = ${organizationId}
        AND NOT (
          (t.status = 'completed' AND (t.completed_at < ${threeDaysAgoStr} OR (t.completed_at IS NULL AND t.updated_at < ${threeDaysAgoStr})))
          OR (t.status = 'verified' AND (t.verified_at < ${threeDaysAgoStr} OR (t.verified_at IS NULL AND COALESCE(t.completed_at, t.updated_at) < ${threeDaysAgoStr})))
        )
      ORDER BY t.due_date ASC NULLS LAST
    `;
    let tasks = rows as any[];
    if (tasks.length > 0) {
      const { rows: assigneeRows } = await sql`
        SELECT ta.task_id, u.id, u.name FROM task_assignments ta
        JOIN users u ON u.id = ta.user_id
        JOIN tasks t ON t.id = ta.task_id AND t.organization_id = ${organizationId}
      `;
      const assigneesByTask: Record<number, { id: number; name: string }[]> = {};
      for (const r of assigneeRows as any[]) {
        if (!assigneesByTask[r.task_id]) assigneesByTask[r.task_id] = [];
        assigneesByTask[r.task_id].push({ id: r.id, name: r.name });
      }
      tasks = tasks.map((t: any) => ({ ...t, assignees: assigneesByTask[t.id] || [] }));
    }
    if (status) tasks = tasks.filter((t: any) => t.status === status);
    if (assigned) {
      const aid = parseInt(assigned);
      tasks = tasks.filter((t: any) => t.assigned_to === aid || (t.assignees && t.assignees.some((a: any) => a.id === aid)));
    }
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const organizationId = req.user?.organizationId;
    const taskRows = await sql`
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = ${taskId} AND t.organization_id = ${organizationId}
    `;
    const task = taskRows.rows[0] as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const [checklistsRes, commentsRes, photosRes, assigneesRes] = await Promise.all([
      sql`SELECT * FROM task_checklists WHERE task_id = ${task.id}`,
      sql`SELECT c.*, u.name as user_name FROM comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ${task.id} ORDER BY c.created_at DESC`,
      sql`SELECT * FROM photos WHERE task_id = ${task.id} ORDER BY uploaded_at DESC`,
      sql`SELECT u.id, u.name FROM users u INNER JOIN task_assignments ta ON u.id = ta.user_id WHERE ta.task_id = ${task.id}`
    ]);
    const assignees = (assigneesRes.rows as any[]).map((r: any) => ({ id: r.id, name: r.name }));
    res.json({
      ...task,
      assignees,
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
    const { title, description, assigned_to, assigned_to_ids, priority, due_date, recurrence } = req.body;
    const organizationId = req.user?.organizationId;
    const createdBy = req.user?.id;
    const assigneeIds: number[] = Array.isArray(assigned_to_ids)
      ? assigned_to_ids.filter((id: any) => Number.isInteger(Number(id))).map((id: any) => Number(id))
      : assigned_to != null && assigned_to !== ''
        ? [Number(assigned_to)]
        : [];
    const status = assigneeIds.length > 0 ? 'assigned' : 'planned';
    const firstAssigneeId = assigneeIds.length > 0 ? assigneeIds[0] : null;

    if (assigneeIds.length > 0) {
      for (const uid of assigneeIds) {
        const assigneeCheck = await sql`SELECT id FROM users WHERE id = ${uid} AND organization_id = ${organizationId}`;
        if (assigneeCheck.rows.length === 0) {
          return res.status(403).json({ error: 'Assignee must belong to your organization' });
        }
      }
    }

    const dueDateValue = due_date && String(due_date).trim() !== '' ? due_date : null;
    const result = await sql`
      INSERT INTO tasks (title, description, assigned_to, organization_id, priority, status, due_date, recurrence, created_by)
      VALUES (${title}, ${description ?? null}, ${firstAssigneeId}, ${organizationId}, ${priority || 'medium'}, ${status}, ${dueDateValue}, ${recurrence || 'once'}, ${createdBy})
      RETURNING *
    `;
    const task = result.rows[0] as any;
    if (assigneeIds.length > 0) {
      for (const uid of assigneeIds) {
        await sql`INSERT INTO task_assignments (task_id, user_id) VALUES (${task.id}, ${uid}) ON CONFLICT (task_id, user_id) DO NOTHING`;
      }
      const [orgRows, creatorRows] = await Promise.all([
        sql`SELECT name FROM organizations WHERE id = ${organizationId}`,
        sql`SELECT name FROM users WHERE id = ${createdBy}`
      ]);
      const organizationName = (orgRows.rows[0] as any)?.name || 'Organization';
      const createdByName = (creatorRows.rows[0] as any)?.name || 'Unknown';
      const emailAndPushPromises: Promise<void>[] = [];
      for (const uid of assigneeIds) {
        const u = await sql`SELECT id, email, name FROM users WHERE id = ${uid} AND organization_id = ${organizationId}`;
        const assignee = (u.rows[0] as any) || null;
        if (assignee?.email) {
          emailAndPushPromises.push(
            sendAssignmentNotification(assignee.email, task.title, createdByName, organizationName)
              .then((ok) => { if (!ok) console.warn(`Assignment email skipped for ${assignee.email} (check EMAIL_USER/EMAIL_PASSWORD).`); })
              .catch((err: any) => console.error('Assignment email failed:', assignee.email, err?.message, err?.stack))
          );
        } else {
          console.warn(`Assignment email skipped: user ${uid} has no email in database.`);
        }
        emailAndPushPromises.push(
          sendNotificationToUser(Number(uid), 'משימה חדשה', task.title, undefined, 'mission-assigned')
            .then((r) => { if (r.successCount === 0 && r.failCount === 0) console.warn(`📲 No push subscription for user ${uid}.`); })
            .catch((err: any) => console.error('Push assignment:', err))
        );
      }
      await Promise.allSettled(emailAndPushPromises);
    }
    const assigneesRes = await sql`SELECT u.id, u.name FROM users u INNER JOIN task_assignments ta ON u.id = ta.user_id WHERE ta.task_id = ${task.id}`;
    const assignees = (assigneesRes.rows as any[]).map((r: any) => ({ id: r.id, name: r.name }));
    res.status(201).json({ ...task, assignees });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const { title, description, assigned_to, assigned_to_ids, priority, status, due_date, estimated_time, tags } = req.body;
    const organizationId = req.user?.organizationId;

    const taskRows = await sql`SELECT * FROM tasks WHERE id = ${taskId} AND organization_id = ${organizationId}`;
    const task = taskRows.rows[0] as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const assigneeIdsRows = await sql`SELECT user_id FROM task_assignments WHERE task_id = ${taskId}`;
    const currentAssigneeIds = (assigneeIdsRows.rows as any[]).map((r: any) => r.user_id);
    const isManager = ['admin', 'maintainer'].includes(req.user?.role || '');
    const isAssignedToTask = task.assigned_to === req.user?.id || currentAssigneeIds.includes(req.user?.id);
    if (!isManager && !isAssignedToTask) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    const newStatus =
      (status != null && String(status).trim() !== '')
        ? String(status).trim()
        : task.status;
    const oldStatus = task.status;
    if (newStatus !== oldStatus) {
      try {
        await sql`
          INSERT INTO task_status_history (task_id, old_status, new_status, changed_by)
          VALUES (${taskId}, ${oldStatus}, ${newStatus}, ${req.user?.id})
        `;
      } catch (historyErr: any) {
        console.error('PUT /tasks/:id task_status_history insert failed:', historyErr?.message || historyErr);
      }
    }

    const assigneesChanged = assigned_to_ids !== undefined || assigned_to !== undefined;
    const newAssigneeIds: number[] =
      assigned_to_ids !== undefined
        ? (Array.isArray(assigned_to_ids) ? assigned_to_ids : []).filter((id: any) => Number.isInteger(Number(id))).map((id: any) => Number(id))
        : assigned_to !== undefined
          ? (assigned_to != null && assigned_to !== '' ? [Number(assigned_to)] : [])
          : currentAssigneeIds;
    const firstAssigneeId = assigneesChanged ? (newAssigneeIds.length > 0 ? newAssigneeIds[0] : null) : task.assigned_to;

    const newDueDate = due_date !== undefined ? due_date : task.due_date;
    const dueDateChanged = newDueDate !== task.due_date;
    await sql`
      UPDATE tasks
      SET title = ${title ?? task.title}, description = ${description !== undefined ? description : task.description},
          assigned_to = ${firstAssigneeId},
          priority = ${priority || task.priority}, status = ${newStatus},
          due_date = ${newDueDate},
          estimated_time = ${estimated_time !== undefined ? estimated_time : task.estimated_time},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${taskId}
    `;
    if (dueDateChanged) {
      await sql`UPDATE tasks SET push_reminder_sent_at = NULL WHERE id = ${taskId}`;
    }

    if (newStatus === 'completed' && !task.completed_at) {
      await sql`UPDATE tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = ${taskId}`;
    } else if (newStatus === 'verified' && !task.verified_at) {
      await sql`UPDATE tasks SET verified_at = CURRENT_TIMESTAMP, verified_by = ${req.user?.id} WHERE id = ${taskId}`;
    }

    if (assigneesChanged) {
      await sql`DELETE FROM task_assignments WHERE task_id = ${taskId}`;
      for (const uid of newAssigneeIds) {
        await sql`INSERT INTO task_assignments (task_id, user_id) VALUES (${taskId}, ${uid}) ON CONFLICT (task_id, user_id) DO NOTHING`;
      }
      if (newAssigneeIds.length > 0) {
        const [orgRows, creatorRows] = await Promise.all([
          sql`SELECT name FROM organizations WHERE id = ${organizationId}`,
          sql`SELECT name FROM users WHERE id = ${req.user?.id}`
        ]);
        const organizationName = (orgRows.rows[0] as any)?.name || 'Organization';
        const createdByName = (creatorRows.rows[0] as any)?.name || 'Unknown';
        const taskTitle = title || task.title;
        const emailAndPushPromises: Promise<void>[] = [];
        for (const uid of newAssigneeIds) {
          const u = await sql`SELECT id, email, name FROM users WHERE id = ${uid} AND organization_id = ${organizationId}`;
          const assignee = (u.rows[0] as any) || null;
          if (assignee?.email) {
            emailAndPushPromises.push(
              sendAssignmentNotification(assignee.email, taskTitle, createdByName, organizationName)
                .then((ok) => { if (!ok) console.warn(`Assignment email skipped for ${assignee.email} (check EMAIL_USER/EMAIL_PASSWORD).`); })
                .catch((err: any) => console.error('Assignment email failed:', assignee.email, err?.message, err?.stack))
            );
          } else {
            console.warn(`Assignment email skipped: user ${uid} has no email in database.`);
          }
          emailAndPushPromises.push(
            sendNotificationToUser(Number(uid), 'משימה חדשה', taskTitle, undefined, 'mission-assigned')
              .then((r) => { if (r.successCount === 0 && r.failCount === 0) console.warn(`📲 No push subscription for user ${uid}.`); })
              .catch((err: any) => console.error('Push assignment:', err))
          );
        }
        await Promise.allSettled(emailAndPushPromises);
      }
    }

    if (tags && Array.isArray(tags)) {
      await sql`DELETE FROM task_tags WHERE task_id = ${taskId}`;
      for (const tagId of tags) {
        await sql`INSERT INTO task_tags (task_id, tag_id) VALUES (${taskId}, ${tagId}) ON CONFLICT (task_id, tag_id) DO NOTHING`;
      }
    }

    const updatedRows = await sql`
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = ${taskId}
    `;
    const updated = updatedRows?.rows?.[0] as any;
    if (!updated) {
      console.error('PUT /tasks/:id failed to load updated task:', taskId);
      return res.status(500).json({ error: 'Failed to load updated task' });
    }
    const assigneesRes = await sql`SELECT u.id, u.name FROM users u INNER JOIN task_assignments ta ON u.id = ta.user_id WHERE ta.task_id = ${taskId}`;
    const assignees = (assigneesRes.rows as any[]).map((r: any) => ({ id: r.id, name: r.name }));
    res.json({ ...updated, assignees });
  } catch (error: any) {
    console.error('PUT /tasks/:id error:', error?.message || error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.put('/:id/complete', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const userId = req.user?.id;
    const taskRows = await sql`SELECT * FROM tasks WHERE id = ${taskId}`;
    const task = taskRows.rows[0] as any;
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const inAssignments = await sql`SELECT 1 FROM task_assignments WHERE task_id = ${taskId} AND user_id = ${userId}`;
    if (task.assigned_to !== userId && (inAssignments.rows?.length || 0) === 0) return res.status(404).json({ error: 'Task not found' });

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
    const organizationId = req.user?.organizationId;

    const taskRows = await sql`SELECT * FROM tasks WHERE id = ${taskId} AND organization_id = ${organizationId}`;
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
    const organizationId = req.user?.organizationId;
    const taskRows = await sql`SELECT * FROM tasks WHERE id = ${taskId} AND organization_id = ${organizationId}`;
    const task = taskRows.rows[0];
    if (!task) return res.status(404).json({ error: 'Task not found' });
    await sql`DELETE FROM tasks WHERE id = ${taskId}`;
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
