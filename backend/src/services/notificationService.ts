import db from '../database';
import { sendExpirationNotification } from './emailService';

// Track last notification sent per task (in memory, resets on server restart)
const lastNotificationSent: Map<number, Date> = new Map();

/**
 * Check for tasks that are about to expire (2/3 of time passed) or overdue
 * Sends DAILY email notifications until task is completed
 */
export async function checkForExpiringTasks() {
  try {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Get all tasks that have a due date and are not completed/verified
    const tasks = db
      .prepare(
        `SELECT 
          t.id, 
          t.title,
          t.due_date,
          t.status,
          t.assigned_to,
          t.created_at,
          u.email as assigned_email,
          u.name as assigned_name,
          r.name as restaurant_name
         FROM tasks t
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN restaurants r ON t.restaurant_id = r.id
         WHERE t.due_date IS NOT NULL 
         AND t.status NOT IN ('completed', 'verified')
         AND t.assigned_to IS NOT NULL`
      )
      .all() as any[];

    for (const task of tasks) {
      if (!task.assigned_email) continue;

      const createdAt = new Date(task.created_at);
      const dueAt = new Date(task.due_date);
      const totalTime = dueAt.getTime() - createdAt.getTime();
      const elapsedTime = now.getTime() - createdAt.getTime();
      const progressPercent = (elapsedTime / totalTime) * 100;
      const isOverdue = now > dueAt;

      // Check if 2/3 of the time has passed OR task is overdue
      if (progressPercent >= 66.67 || isOverdue) {
        // Check if we already sent notification today
        const lastSent = lastNotificationSent.get(task.id);
        const shouldSend = !lastSent || (now.getTime() - lastSent.getTime()) >= oneDayMs;

        if (shouldSend) {
          try {
            await sendExpirationNotification({
              recipientEmail: task.assigned_email,
              taskTitle: task.title,
              taskId: task.id,
              dueDate: task.due_date,
              assignedTo: task.assigned_name || 'User',
              restaurantName: task.restaurant_name || 'Restaurant',
            });

            // Track that we sent notification
            lastNotificationSent.set(task.id, now);

            // Log the notification
            const urgency = isOverdue ? '🚨 OVERDUE' : '⚠️ EXPIRING';
            console.log(
              `📧 ${urgency} - Sent daily reminder for task "${task.title}" (ID: ${task.id}) to ${task.assigned_email}`
            );
          } catch (emailError: any) {
            console.error(`Failed to send email for task ${task.id}:`, emailError.message);
          }
        }
      }
    }

    // Clean up tracking for completed tasks
    const completedTaskIds = db
      .prepare(`SELECT id FROM tasks WHERE status IN ('completed', 'verified')`)
      .all() as any[];
    
    for (const task of completedTaskIds) {
      lastNotificationSent.delete(task.id);
    }

  } catch (error: any) {
    console.error('Error checking for expiring tasks:', error.message);
  }
}

/**
 * Clean up old completed tasks
 * Removes tasks that are completed/verified AND 1 week past their due date
 */
export function cleanupOldCompletedTasks() {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    // Find tasks to delete
    const tasksToDelete = db
      .prepare(
        `SELECT id, title FROM tasks 
         WHERE status IN ('completed', 'verified')
         AND due_date IS NOT NULL
         AND due_date < ?`
      )
      .all(oneWeekAgoStr) as any[];

    if (tasksToDelete.length > 0) {
      // Delete related records first
      for (const task of tasksToDelete) {
        db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(task.id);
        db.prepare('DELETE FROM task_checklists WHERE task_id = ?').run(task.id);
        db.prepare('DELETE FROM comments WHERE task_id = ?').run(task.id);
        db.prepare('DELETE FROM photos WHERE task_id = ?').run(task.id);
        db.prepare('DELETE FROM task_status_history WHERE task_id = ?').run(task.id);
      }

      // Delete the tasks
      const result = db
        .prepare(
          `DELETE FROM tasks 
           WHERE status IN ('completed', 'verified')
           AND due_date IS NOT NULL
           AND due_date < ?`
        )
        .run(oneWeekAgoStr);

      console.log(`🗑️ Cleaned up ${result.changes} old completed tasks`);
    }
  } catch (error: any) {
    console.error('Error cleaning up old tasks:', error.message);
  }
}

/**
 * Start the background notification service
 * Runs every hour to check for expiring tasks and cleanup old tasks
 */
export function startNotificationService() {
  // Check immediately on startup
  checkForExpiringTasks();
  cleanupOldCompletedTasks();

  // Run every hour (3600000 milliseconds)
  const intervalId = setInterval(() => {
    checkForExpiringTasks();
    cleanupOldCompletedTasks();
  }, 3600000);

  console.log('🔔 Notification service started - checking every hour');
  console.log('🗑️ Cleanup service started - removing old completed tasks');
  return intervalId;
}

/**
 * Stop the notification service
 */
export function stopNotificationService(intervalId: NodeJS.Timeout) {
  clearInterval(intervalId);
  console.log('🔔 Notification service stopped');
}
