import express, { Response } from 'express';
import db from '../database';
import { AuthRequest, authenticateToken, authorize } from '../middleware';

const router = express.Router();

// Get dashboard stats for maintainer/admin
router.get('/stats/overview', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    const totalTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE restaurant_id = ?
    `).get(restaurantId) as any;

    const completedTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE restaurant_id = ? AND status = 'verified'
    `).get(restaurantId) as any;

    const overdueTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE restaurant_id = ? AND status != 'verified' AND status != 'completed' 
      AND due_date < datetime('now')
    `).get(restaurantId) as any;

    const inProgressTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE restaurant_id = ? AND status = 'in_progress'
    `).get(restaurantId) as any;

    const completionRate = totalTasks.count > 0 
      ? Math.round((completedTasks.count / totalTasks.count) * 100)
      : 0;

    // Calculate pending (not completed/verified)
    const pendingTasks = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE restaurant_id = ? AND status NOT IN ('completed', 'verified')
    `).get(restaurantId) as any;

    res.json({
      total_tasks: totalTasks.count,
      completed_tasks: completedTasks.count,
      completion_rate: completionRate,
      overdue_tasks: overdueTasks.count,
      pending_tasks: pendingTasks.count,
      in_progress_tasks: inProgressTasks.count,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get worker performance (all users with tasks)
router.get('/stats/staff-performance', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    // Query using task_assignments table for multi-assignee support
    const performance = db.prepare(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        u.role as user_role,
        COUNT(DISTINCT ta.task_id) as total_assigned,
        SUM(CASE WHEN t.status IN ('verified', 'completed') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status IN ('in_progress', 'waiting') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status NOT IN ('verified', 'completed') AND t.due_date < datetime('now') THEN 1 ELSE 0 END) as overdue
      FROM users u
      LEFT JOIN task_assignments ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id AND t.restaurant_id = ?
      WHERE u.restaurant_id = ? AND u.status = 'approved'
      GROUP BY u.id
      HAVING total_assigned > 0
      ORDER BY completed DESC, total_assigned DESC
    `).all(restaurantId, restaurantId) as any[];

    // Add completion rate to each staff member
    const performanceWithRate = performance.map((staff: any) => ({
      ...staff,
      completion_rate: staff.total_assigned > 0 
        ? Math.round((staff.completed / staff.total_assigned) * 100)
        : 0
    }));

    res.json(performanceWithRate);
  } catch (error) {
    console.error('Staff performance error:', error);
    res.status(500).json({ error: 'Failed to fetch staff performance' });
  }
});

// Get task breakdown by category/priority
router.get('/stats/tasks-by-priority', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    const byPriority = db.prepare(`
      SELECT 
        priority,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('in_progress', 'waiting') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status IN ('planned', 'assigned') AND due_date < datetime('now') THEN 1 ELSE 0 END) as overdue
      FROM tasks
      WHERE restaurant_id = ?
      GROUP BY priority
    `).all(restaurantId);

    res.json(byPriority);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task breakdown' });
  }
});

// Get overdue tasks
router.get('/stats/overdue-tasks', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    const overdue = db.prepare(`
      SELECT 
        t.*,
        u.name as assigned_to_name,
        creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.restaurant_id = ? 
      AND t.status NOT IN ('verified', 'completed')
      AND t.due_date < datetime('now')
      ORDER BY t.due_date ASC
    `).all(restaurantId);

    res.json(overdue);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
});

// Get tasks by status
router.get('/stats/by-status', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    const byStatus = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks
      WHERE restaurant_id = ?
      GROUP BY status
      ORDER BY 
        CASE status
          WHEN 'planned' THEN 1
          WHEN 'assigned' THEN 2
          WHEN 'in_progress' THEN 3
          WHEN 'waiting' THEN 4
          WHEN 'completed' THEN 5
          WHEN 'verified' THEN 6
          ELSE 7
        END
    `).all(restaurantId);

    res.json(byStatus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks by status' });
  }
});

// Get today's stats
router.get('/stats/today', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    // Tasks completed today
    const completedToday = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE restaurant_id = ? 
      AND status IN ('completed', 'verified')
      AND date(updated_at) = date('now')
    `).get(restaurantId) as any;

    // Tasks due today
    const dueToday = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE restaurant_id = ? 
      AND date(due_date) = date('now')
    `).get(restaurantId) as any;

    // Tasks created today
    const createdToday = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE restaurant_id = ? 
      AND date(created_at) = date('now')
    `).get(restaurantId) as any;

    // Tasks due in next 24 hours (not completed)
    const dueSoon = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE restaurant_id = ? 
      AND status NOT IN ('completed', 'verified')
      AND due_date BETWEEN datetime('now') AND datetime('now', '+1 day')
    `).get(restaurantId) as any;

    res.json({
      completed_today: completedToday.count,
      due_today: dueToday.count,
      created_today: createdToday.count,
      due_soon: dueSoon.count
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today stats' });
  }
});

// Get this week's stats
router.get('/stats/weekly', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    // Tasks completed this week
    const completedThisWeek = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE restaurant_id = ? 
      AND status IN ('completed', 'verified')
      AND date(updated_at) >= date('now', '-7 days')
    `).get(restaurantId) as any;

    // Tasks created this week
    const createdThisWeek = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE restaurant_id = ? 
      AND date(created_at) >= date('now', '-7 days')
    `).get(restaurantId) as any;

    // Daily breakdown for the week
    const dailyBreakdown = db.prepare(`
      SELECT 
        date(created_at) as date,
        COUNT(*) as created,
        SUM(CASE WHEN status IN ('completed', 'verified') THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE restaurant_id = ? 
      AND date(created_at) >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date(created_at) DESC
    `).all(restaurantId);

    res.json({
      completed_this_week: completedThisWeek.count,
      created_this_week: createdThisWeek.count,
      daily_breakdown: dailyBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

// Get recurring tasks stats
router.get('/stats/recurring', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    const recurringStats = db.prepare(`
      SELECT 
        recurrence,
        COUNT(*) as count,
        SUM(CASE WHEN status IN ('completed', 'verified') THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE restaurant_id = ? AND recurrence != 'once'
      GROUP BY recurrence
    `).all(restaurantId);

    const totalRecurring = db.prepare(`
      SELECT COUNT(*) as count FROM tasks 
      WHERE restaurant_id = ? AND recurrence != 'once'
    `).get(restaurantId) as any;

    res.json({
      total_recurring: totalRecurring.count,
      by_type: recurringStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recurring stats' });
  }
});

// Get tags usage stats
router.get('/stats/tags', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    const tagsUsage = db.prepare(`
      SELECT 
        tg.id,
        tg.name,
        tg.color,
        tg.color2,
        COUNT(DISTINCT t.id) as task_count
      FROM tags tg
      LEFT JOIN task_tags tt ON tg.id = tt.tag_id
      LEFT JOIN tasks t ON tt.task_id = t.id AND t.restaurant_id = ?
      WHERE tg.restaurant_id = ?
      GROUP BY tg.id
      ORDER BY task_count DESC
    `).all(restaurantId, restaurantId);

    res.json(tagsUsage);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tags stats' });
  }
});

// Get tasks by user (worker)
router.get('/stats/tasks-by-user/:userId', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const userId = parseInt(req.params.userId);

    console.log('Fetching tasks for user:', userId, 'restaurant:', restaurantId);

    const tasks = db.prepare(`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.created_at
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      WHERE t.restaurant_id = ? AND ta.user_id = ?
      ORDER BY 
        CASE t.status
          WHEN 'in_progress' THEN 1
          WHEN 'waiting' THEN 2
          WHEN 'assigned' THEN 3
          WHEN 'planned' THEN 4
          WHEN 'completed' THEN 5
          WHEN 'verified' THEN 6
          ELSE 7
        END,
        t.due_date ASC
    `).all(restaurantId, userId);

    console.log('Found tasks:', tasks.length);

    // Get tags for each task
    const tasksWithTags = tasks.map((task: any) => {
      const tags = db.prepare(`
        SELECT tg.id, tg.name, tg.color, tg.color2
        FROM tags tg
        INNER JOIN task_tags tt ON tg.id = tt.tag_id
        WHERE tt.task_id = ?
      `).all(task.id);
      return { ...task, tags };
    });

    res.json(tasksWithTags);
  } catch (error) {
    console.error('Tasks by user error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks by user' });
  }
});

// Get tasks by tag
router.get('/stats/tasks-by-tag/:tagId', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const tagId = parseInt(req.params.tagId);
    
    console.log('Fetching tasks for tag:', tagId, 'restaurant:', restaurantId);

    const tasks = db.prepare(`
      SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        t.created_at,
        creator.name as created_by_name
      FROM tasks t
      INNER JOIN task_tags tt ON t.id = tt.task_id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.restaurant_id = ? AND tt.tag_id = ?
      ORDER BY 
        CASE t.status
          WHEN 'in_progress' THEN 1
          WHEN 'waiting' THEN 2
          WHEN 'assigned' THEN 3
          WHEN 'planned' THEN 4
          WHEN 'completed' THEN 5
          WHEN 'verified' THEN 6
          ELSE 7
        END,
        t.due_date ASC
    `).all(restaurantId, tagId);

    console.log('Found tasks:', tasks.length);

    // Get assignees for each task
    const tasksWithAssignees = tasks.map((task: any) => {
      const assignees = db.prepare(`
        SELECT u.id, u.name, u.email
        FROM users u
        INNER JOIN task_assignments ta ON u.id = ta.user_id
        WHERE ta.task_id = ?
      `).all(task.id);
      return { ...task, assignees };
    });

    res.json(tasksWithAssignees);
  } catch (error) {
    console.error('Tasks by tag error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks by tag' });
  }
});

export default router;
