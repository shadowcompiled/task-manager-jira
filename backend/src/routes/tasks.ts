import express, { Response } from 'express';
import db from '../database';
import { AuthRequest, authenticateToken, authorize } from '../middleware';
import { sendAssignmentNotification } from '../services/emailService';

const router = express.Router();

// Helper: Get assignees for a task
function getTaskAssignees(taskId: number): any[] {
  return db.prepare(`
    SELECT u.id, u.name, u.email
    FROM task_assignments ta
    JOIN users u ON ta.user_id = u.id
    WHERE ta.task_id = ?
  `).all(taskId) as any[];
}

// Helper: Set task assignees (handles both single and multiple)
function setTaskAssignees(taskId: number, assignees: number | number[] | null, restaurantId: number): any[] {
  // Remove existing assignments
  db.prepare('DELETE FROM task_assignments WHERE task_id = ?').run(taskId);
  
  if (!assignees) return [];
  
  // Normalize to array
  const assigneeIds = Array.isArray(assignees) ? assignees : [assignees];
  
  // Add new assignments
  const insertStmt = db.prepare('INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)');
  assigneeIds.forEach(userId => {
    if (userId) {
      try {
        insertStmt.run(taskId, userId);
      } catch (e) {
        // Ignore duplicates
      }
    }
  });
  
  // Also update the legacy assigned_to field with the first assignee for backward compatibility
  const firstAssignee = assigneeIds[0] || null;
  db.prepare('UPDATE tasks SET assigned_to = ? WHERE id = ?').run(firstAssignee, taskId);
  
  return getTaskAssignees(taskId);
}

// Get all team members for a restaurant (for assignment dropdown)
router.get('/team/members', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const users = db
      .prepare('SELECT id, name, email, role FROM users WHERE restaurant_id = ? ORDER BY name ASC')
      .all(restaurantId);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Get all tasks for a restaurant
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const restaurantId = req.user?.restaurantId;
    const status = req.query.status as string;
    const assigned = req.query.assigned_to as string;

    let query = `
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.restaurant_id = ?
    `;
    const params: any[] = [restaurantId];

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (assigned) {
      // Filter by tasks that have this user assigned (using junction table)
      query += ` AND EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.user_id = ?)`;
      params.push(parseInt(assigned));
    }

    query += ` ORDER BY t.due_date ASC`;

    const tasks = db.prepare(query).all(...params) as any[];
    
    // Fetch tags and assignees for each task
    const tasksWithDetails = tasks.map((task: any) => {
      const tags = db.prepare(`
        SELECT tg.* FROM tags tg
        JOIN task_tags tt ON tg.id = tt.tag_id
        WHERE tt.task_id = ?
      `).all(task.id);
      
      const assignees = getTaskAssignees(task.id);
      
      // Generate combined name for display
      const assigneeNames = assignees.map((a: any) => a.name).join(', ');
      
      return { 
        ...task, 
        tags,
        assignees,
        assigned_to_name: assigneeNames || task.assigned_to_name || null
      };
    });
    
    res.json(tasksWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get single task with checklists and comments
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const task = db.prepare(`
      SELECT t.*, u.name as assigned_to_name, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = ? AND t.restaurant_id = ?
    `).get(req.params.id, req.user?.restaurantId) as any;

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const checklists = db.prepare('SELECT * FROM task_checklists WHERE task_id = ?').all(task.id);
    const comments = db.prepare(`
      SELECT c.*, u.name as user_name
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.task_id = ?
      ORDER BY c.created_at DESC
    `).all(task.id);

    const photos = db.prepare('SELECT * FROM photos WHERE task_id = ? ORDER BY uploaded_at DESC').all(task.id);
    
    const tags = db.prepare(`
      SELECT tg.* FROM tags tg
      JOIN task_tags tt ON tg.id = tt.tag_id
      WHERE tt.task_id = ?
    `).all(task.id);
    
    const assignees = getTaskAssignees(task.id);
    const assigneeNames = assignees.map((a: any) => a.name).join(', ');

    res.json({ 
      ...task, 
      checklists, 
      comments, 
      photos, 
      tags,
      assignees,
      assigned_to_name: assigneeNames || task.assigned_to_name || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', authenticateToken, authorize(['admin', 'maintainer']), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, assigned_to, assignees, priority, due_date, recurrence, estimated_time, tags } = req.body;

    // Support both single assigned_to and multiple assignees
    const assigneeList = assignees || (assigned_to ? [assigned_to] : []);
    const hasAssignees = assigneeList.length > 0;

    const stmt = db.prepare(`
      INSERT INTO tasks (
        title, description, assigned_to, restaurant_id, priority, 
        status, due_date, recurrence, estimated_time, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title,
      description || null,
      assigneeList[0] || null, // First assignee for backward compatibility
      req.user?.restaurantId,
      priority || 'medium',
      hasAssignees ? 'assigned' : 'planned',
      due_date || null,
      recurrence || 'once',
      estimated_time || null,
      req.user?.id
    );

    const taskId = result.lastInsertRowid as number;

    // Add multiple assignees
    if (hasAssignees) {
      setTaskAssignees(taskId, assigneeList, req.user?.restaurantId || 0);
    }

    // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      tags.forEach((tagId: number) => {
        db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId);
      });
    }

    // Send email notifications to all assignees
    if (hasAssignees) {
      const restaurant = db.prepare('SELECT name FROM restaurants WHERE id = ?').get(req.user?.restaurantId) as any;
      const createdBy = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user?.id) as any;
      
      for (const userId of assigneeList) {
        const assignedUser = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId) as any;
        if (assignedUser && assignedUser.email) {
          sendAssignmentNotification(
            assignedUser.email,
            title,
            createdBy?.name || 'Unknown',
            restaurant?.name || 'Restaurant'
          ).catch((err: any) => console.error('Failed to send email:', err));
        }
      }
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    const finalAssignees = getTaskAssignees(taskId);
    res.status(201).json({ ...task, assignees: finalAssignees });
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { title, description, assigned_to, assignees, priority, status, due_date, estimated_time, tags } = req.body;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND restaurant_id = ?')
      .get(req.params.id, req.user?.restaurantId) as any;

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check authorization: admin/maintainer can do anything, workers can only update their own assignments
    const isManager = ['admin', 'maintainer'].includes(req.user?.role || '');
    const currentAssignees = getTaskAssignees(task.id);
    const isAssignedToTask = currentAssignees.some((a: any) => a.id === req.user?.id) || task.assigned_to === req.user?.id;

    if (!isManager && !isAssignedToTask) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    // Support both single assigned_to and multiple assignees
    const newAssigneeList = assignees || (assigned_to !== undefined ? (assigned_to ? [assigned_to] : []) : null);
    const hasNewAssignees = newAssigneeList && newAssigneeList.length > 0;

    // Auto-change status to 'assigned' when assigning someone to an unassigned task
    let newStatus = status || task.status;
    const oldStatus = task.status;
    
    // If task is being assigned and status is 'planned', change to 'assigned'
    if (hasNewAssignees && oldStatus === 'planned') {
      if (!status || status === 'planned') {
        newStatus = 'assigned';
      }
    }
    
    // If all assignees removed, change status back to planned
    if (newAssigneeList && newAssigneeList.length === 0 && oldStatus === 'assigned') {
      newStatus = 'planned';
    }

    // Track status change
    if (newStatus !== oldStatus) {
      db.prepare(
        `INSERT INTO task_status_history (task_id, old_status, new_status, changed_by)
         VALUES (?, ?, ?, ?)`
      ).run(req.params.id, oldStatus, newStatus, req.user?.id);
    }

    const updateStmt = db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, estimated_time = ?
      WHERE id = ?
    `);

    updateStmt.run(
      title || task.title,
      description !== undefined ? description : task.description,
      priority || task.priority,
      newStatus,
      due_date || task.due_date,
      estimated_time !== undefined ? estimated_time : task.estimated_time,
      req.params.id
    );

    // Update assignees if provided
    if (newAssigneeList !== null) {
      const oldAssigneeIds = currentAssignees.map((a: any) => a.id);
      const addedAssignees = newAssigneeList.filter((id: number) => !oldAssigneeIds.includes(id));
      
      setTaskAssignees(parseInt(req.params.id), newAssigneeList, req.user?.restaurantId || 0);
      
      // Send email notifications to newly added assignees
      if (addedAssignees.length > 0) {
        const restaurant = db.prepare('SELECT name FROM restaurants WHERE id = ?').get(req.user?.restaurantId) as any;
        const createdBy = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user?.id) as any;
        
        for (const userId of addedAssignees) {
          const assignedUser = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId) as any;
          if (assignedUser && assignedUser.email) {
            sendAssignmentNotification(
              assignedUser.email,
              title || task.title,
              createdBy?.name || 'Unknown',
              restaurant?.name || 'Restaurant'
            ).catch((err: any) => console.error('Failed to send email:', err));
          }
        }
      }
    }

    // Update tags if provided
    if (tags && Array.isArray(tags)) {
      db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(req.params.id);
      tags.forEach((tagId: number) => {
        db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)')
          .run(req.params.id, tagId);
      });
    }

    const finalAssignees = getTaskAssignees(parseInt(req.params.id));
    const assigneeNames = finalAssignees.map((a: any) => a.name).join(', ');
    
    const updated = db.prepare(`
      SELECT t.*, creator.name as created_by_name
      FROM tasks t
      LEFT JOIN users creator ON t.created_by = creator.id
      WHERE t.id = ?
    `).get(req.params.id) as any;
    
    res.json({ 
      ...updated, 
      assignees: finalAssignees,
      assigned_to_name: assigneeNames 
    });
  } catch (error) {
    console.error('Failed to update task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Mark task as completed
router.put('/:id/complete', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    // Check if user is assigned to this task
    const assignees = getTaskAssignees(parseInt(req.params.id));
    const isAssigned = assignees.some((a: any) => a.id === req.user?.id);
    
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND restaurant_id = ?')
      .get(req.params.id, req.user?.restaurantId) as any;

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Allow if user is assigned (either via junction table or legacy field)
    if (!isAssigned && task.assigned_to !== req.user?.id) {
      return res.status(403).json({ error: 'Not authorized to complete this task' });
    }

    const updateStmt = db.prepare(`
      UPDATE tasks
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateStmt.run(req.params.id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Verify task completion
router.put('/:id/verify', authenticateToken, authorize(['manager', 'admin', 'maintainer']), (req: AuthRequest, res: Response) => {
  try {
    const { comment } = req.body;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND restaurant_id = ?')
      .get(req.params.id, req.user?.restaurantId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updateStmt = db.prepare(`
      UPDATE tasks
      SET status = 'verified', verified_at = CURRENT_TIMESTAMP, verified_by = ?
      WHERE id = ?
    `);

    updateStmt.run(req.user?.id, req.params.id);

    if (comment) {
      const commentStmt = db.prepare(`
        INSERT INTO comments (task_id, user_id, content)
        VALUES (?, ?, ?)
      `);
      commentStmt.run(req.params.id, req.user?.id, comment);
    }

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify task' });
  }
});

// Delete task
router.delete('/:id', authenticateToken, authorize(['admin', 'manager', 'maintainer']), (req: AuthRequest, res: Response) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND restaurant_id = ?')
      .get(req.params.id, req.user?.restaurantId);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
