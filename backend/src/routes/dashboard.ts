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

// Get worker performance
router.get('/stats/staff-performance', authenticateToken, authorize(['maintainer', 'admin']), (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;

    const performance = db.prepare(`
      SELECT 
        u.id as user_id,
        u.name as user_name,
        COUNT(t.id) as total_assigned,
        SUM(CASE WHEN t.status IN ('verified', 'completed') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN t.status IN ('in_progress', 'waiting') THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN t.status IN ('planned', 'assigned') AND t.due_date < datetime('now') THEN 1 ELSE 0 END) as overdue
      FROM users u
      LEFT JOIN tasks t ON u.id = t.assigned_to AND t.restaurant_id = ?
      WHERE u.restaurant_id = ? AND u.role = 'worker'
      GROUP BY u.id
      ORDER BY completed DESC
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

export default router;
