import express, { Response } from 'express';
import { sql } from '../database';
import { AuthRequest, authenticateToken, authorize } from '../middleware';

const router = express.Router();

router.get('/stats/overview', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const [totalRes, completedRes, overdueRes, inProgressRes, pendingRes] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId}`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND status = 'verified'`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND status NOT IN ('verified', 'completed') AND due_date < NOW()`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND status = 'in_progress'`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND status NOT IN ('completed', 'verified')`
    ]);
    const totalTasks = (totalRes.rows[0] as any)?.count ?? 0;
    const completedTasks = (completedRes.rows[0] as any)?.count ?? 0;
    const overdueTasks = (overdueRes.rows[0] as any)?.count ?? 0;
    const inProgressTasks = (inProgressRes.rows[0] as any)?.count ?? 0;
    const pendingTasks = (pendingRes.rows[0] as any)?.count ?? 0;
    const completionRate = totalTasks > 0 ? Math.round((Number(completedTasks) / Number(totalTasks)) * 100) : 0;
    res.json({
      total_tasks: Number(totalTasks),
      completed_tasks: Number(completedTasks),
      completion_rate: completionRate,
      overdue_tasks: Number(overdueTasks),
      pending_tasks: Number(pendingTasks),
      in_progress_tasks: Number(inProgressTasks)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/stats/staff-performance', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { rows } = await sql`
      SELECT u.id as user_id, u.name as user_name, u.role as user_role,
        COUNT(DISTINCT ta.task_id) as total_assigned,
        SUM(CASE WHEN t.status IN ('verified', 'completed') THEN 1 ELSE 0 END)::int as completed,
        SUM(CASE WHEN t.status IN ('in_progress', 'waiting') THEN 1 ELSE 0 END)::int as in_progress,
        SUM(CASE WHEN t.status NOT IN ('verified', 'completed') AND t.due_date < NOW() THEN 1 ELSE 0 END)::int as overdue
      FROM users u
      LEFT JOIN task_assignments ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id AND t.organization_id = ${organizationId}
      WHERE u.organization_id = ${organizationId} AND u.status = 'approved'
      GROUP BY u.id
      HAVING COUNT(DISTINCT ta.task_id) > 0
      ORDER BY completed DESC, total_assigned DESC
    `;
    const performanceWithRate = (rows as any[]).map(staff => ({
      ...staff,
      completion_rate: staff.total_assigned > 0 ? Math.round((staff.completed / staff.total_assigned) * 100) : 0
    }));
    res.json(performanceWithRate);
  } catch (error) {
    console.error('Staff performance error:', error);
    res.status(500).json({ error: 'Failed to fetch staff performance' });
  }
});

router.get('/stats/tasks-by-priority', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { rows } = await sql`
      SELECT priority, COUNT(*)::int as count,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END)::int as completed,
        SUM(CASE WHEN status IN ('in_progress', 'waiting') THEN 1 ELSE 0 END)::int as in_progress,
        SUM(CASE WHEN status IN ('planned', 'assigned') AND due_date < NOW() THEN 1 ELSE 0 END)::int as overdue
      FROM tasks WHERE organization_id = ${organizationId}
      GROUP BY priority
    `;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task breakdown' });
  }
});

router.get('/stats/overdue-tasks', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { rows } = await sql`
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.organization_id = ${organizationId} AND t.status NOT IN ('verified', 'completed') AND t.due_date < NOW()
      ORDER BY t.due_date ASC
    `;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
});

router.get('/stats/by-status', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { rows } = await sql`
      SELECT status, COUNT(*)::int as count FROM tasks
      WHERE organization_id = ${organizationId}
      GROUP BY status
      ORDER BY CASE status WHEN 'planned' THEN 1 WHEN 'assigned' THEN 2 WHEN 'in_progress' THEN 3 WHEN 'waiting' THEN 4 WHEN 'completed' THEN 5 WHEN 'verified' THEN 6 ELSE 7 END
    `;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks by status' });
  }
});

router.get('/stats/today', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    // Use Israel timezone so "today" matches the user's day (app is Hebrew/Israel-oriented)
    const [completedToday, dueToday, createdToday, dueSoon] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND status IN ('completed', 'verified') AND ((completed_at AT TIME ZONE 'Asia/Jerusalem')::date = (NOW() AT TIME ZONE 'Asia/Jerusalem')::date OR (updated_at AT TIME ZONE 'Asia/Jerusalem')::date = (NOW() AT TIME ZONE 'Asia/Jerusalem')::date)`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND due_date IS NOT NULL AND (due_date AT TIME ZONE 'Asia/Jerusalem')::date = (NOW() AT TIME ZONE 'Asia/Jerusalem')::date`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND (created_at AT TIME ZONE 'Asia/Jerusalem')::date = (NOW() AT TIME ZONE 'Asia/Jerusalem')::date`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND status NOT IN ('completed', 'verified') AND due_date IS NOT NULL AND due_date BETWEEN NOW() AND NOW() + INTERVAL '1 day'`
    ]);
    res.json({
      completed_today: Number((completedToday.rows[0] as any)?.count ?? 0),
      due_today: Number((dueToday.rows[0] as any)?.count ?? 0),
      created_today: Number((createdToday.rows[0] as any)?.count ?? 0),
      due_soon: Number((dueSoon.rows[0] as any)?.count ?? 0)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today stats' });
  }
});

router.get('/stats/weekly', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const [completedRes, createdRes, dailyRes] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND status IN ('completed', 'verified') AND (completed_at >= NOW() - INTERVAL '7 days' OR updated_at >= NOW() - INTERVAL '7 days')`,
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND created_at >= NOW() - INTERVAL '7 days'`,
      sql`
        SELECT (created_at::date)::text as date, COUNT(*)::int as created,
          SUM(CASE WHEN status IN ('completed', 'verified') THEN 1 ELSE 0 END)::int as completed
        FROM tasks WHERE organization_id = ${organizationId} AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY created_at::date ORDER BY created_at::date DESC
      `
    ]);
    res.json({
      completed_this_week: Number((completedRes.rows[0] as any)?.count ?? 0),
      created_this_week: Number((createdRes.rows[0] as any)?.count ?? 0),
      daily_breakdown: dailyRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

router.get('/stats/recurring', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const [totalRes, byTypeRes] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM tasks WHERE organization_id = ${organizationId} AND recurrence != 'once'`,
      sql`
        SELECT recurrence, COUNT(*)::int as count, SUM(CASE WHEN status IN ('completed', 'verified') THEN 1 ELSE 0 END)::int as completed
        FROM tasks WHERE organization_id = ${organizationId} AND recurrence != 'once'
        GROUP BY recurrence
      `
    ]);
    res.json({
      total_recurring: Number((totalRes.rows[0] as any)?.count ?? 0),
      by_type: byTypeRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recurring stats' });
  }
});

router.get('/stats/tags', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { rows } = await sql`
      SELECT tg.id, tg.name, tg.color, tg.color2, COUNT(DISTINCT t.id)::int as task_count
      FROM tags tg
      LEFT JOIN task_tags tt ON tg.id = tt.tag_id
      LEFT JOIN tasks t ON tt.task_id = t.id AND t.organization_id = ${organizationId}
      WHERE tg.organization_id = ${organizationId}
      GROUP BY tg.id ORDER BY task_count DESC
    `;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags stats' });
  }
});

router.get('/stats/tasks-by-user/:userId', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = parseInt(req.params.userId);
    const { rows: tasks } = await sql`
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at
      FROM tasks t INNER JOIN task_assignments ta ON t.id = ta.task_id
      WHERE t.organization_id = ${organizationId} AND ta.user_id = ${userId}
      ORDER BY CASE t.status WHEN 'in_progress' THEN 1 WHEN 'waiting' THEN 2 WHEN 'assigned' THEN 3 WHEN 'planned' THEN 4 WHEN 'completed' THEN 5 WHEN 'verified' THEN 6 ELSE 7 END, t.due_date ASC NULLS LAST
    `;
    const tasksWithTags = await Promise.all((tasks as any[]).map(async task => {
      const tagRes = await sql`SELECT tg.id, tg.name, tg.color, tg.color2 FROM tags tg INNER JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ${task.id}`;
      return { ...task, tags: tagRes.rows };
    }));
    res.json(tasksWithTags);
  } catch (error) {
    console.error('Tasks by user error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks by user' });
  }
});

router.get('/stats/tasks-by-priority/:priority', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const priority = req.params.priority;
    const { rows: tasks } = await sql`
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at
      FROM tasks t WHERE t.organization_id = ${organizationId} AND t.priority = ${priority}
      ORDER BY CASE t.status WHEN 'in_progress' THEN 1 WHEN 'waiting' THEN 2 WHEN 'assigned' THEN 3 WHEN 'planned' THEN 4 WHEN 'completed' THEN 5 WHEN 'verified' THEN 6 ELSE 7 END, t.due_date ASC NULLS LAST
    `;
    const tasksWithDetails = await Promise.all((tasks as any[]).map(async task => {
      const [tagRes, assigneeRes] = await Promise.all([
        sql`SELECT tg.id, tg.name, tg.color, tg.color2 FROM tags tg INNER JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ${task.id}`,
        sql`SELECT u.id, u.name FROM users u INNER JOIN task_assignments ta ON u.id = ta.user_id WHERE ta.task_id = ${task.id}`
      ]);
      return { ...task, tags: tagRes.rows, assignees: assigneeRes.rows };
    }));
    res.json(tasksWithDetails);
  } catch (error) {
    console.error('Tasks by priority error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks by priority' });
  }
});

router.get('/stats/tasks-by-tag/:tagId', authenticateToken, authorize(['maintainer', 'admin']), async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const tagId = parseInt(req.params.tagId);
    const { rows: tasks } = await sql`
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at, creator.name as created_by_name
      FROM tasks t INNER JOIN task_tags tt ON t.id = tt.task_id LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.organization_id = ${organizationId} AND tt.tag_id = ${tagId}
      ORDER BY CASE t.status WHEN 'in_progress' THEN 1 WHEN 'waiting' THEN 2 WHEN 'assigned' THEN 3 WHEN 'planned' THEN 4 WHEN 'completed' THEN 5 WHEN 'verified' THEN 6 ELSE 7 END, t.due_date ASC NULLS LAST
    `;
    const tasksWithAssignees = await Promise.all((tasks as any[]).map(async task => {
      const assigneeRes = await sql`SELECT u.id, u.name, u.email FROM users u INNER JOIN task_assignments ta ON u.id = ta.user_id WHERE ta.task_id = ${task.id}`;
      return { ...task, assignees: assigneeRes.rows };
    }));
    res.json(tasksWithAssignees);
  } catch (error) {
    console.error('Tasks by tag error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks by tag' });
  }
});

export default router;
