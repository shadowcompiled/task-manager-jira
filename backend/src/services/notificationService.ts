import { sql } from '../database';
import { sendExpirationNotification } from './emailService';

const lastNotificationSent: Map<number, Date> = new Map();
const lastRecurringCheck: { daily?: string; weekly?: string; monthly?: string } = {};

export async function checkForExpiringTasks() {
  try {
    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const { rows: tasks } = await sql`
      SELECT t.id, t.title, t.due_date, t.status, t.created_at, r.name as organization_name
      FROM tasks t
      LEFT JOIN organizations r ON t.organization_id = r.id
      WHERE t.due_date IS NOT NULL AND t.status NOT IN ('completed', 'verified')
    `;
    for (const task of tasks as any[]) {
      const createdAt = new Date(task.created_at);
      const dueAt = new Date(task.due_date);
      const totalTime = dueAt.getTime() - createdAt.getTime();
      const elapsedTime = now.getTime() - createdAt.getTime();
      const progressPercent = totalTime > 0 ? (elapsedTime / totalTime) * 100 : 100;
      const isOverdue = now > dueAt;
      if (progressPercent >= 66.67 || isOverdue) {
        const { rows: assignees } = await sql`
          SELECT u.id, u.email, u.name FROM task_assignments ta
          JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ${task.id}
        `;
        if (assignees.length === 0) continue;
        const notificationKey = task.id;
        const lastSent = lastNotificationSent.get(notificationKey);
        const shouldSend = !lastSent || (now.getTime() - lastSent.getTime()) >= oneDayMs;
        if (shouldSend) {
          for (const assignee of assignees as any[]) {
            try {
              await sendExpirationNotification({
                recipientEmail: assignee.email,
                taskTitle: task.title,
                taskId: task.id,
                dueDate: task.due_date,
                assignedTo: assignee.name || 'User',
                organizationName: task.organization_name || 'Organization',
              });
              const urgency = isOverdue ? 'OVERDUE' : '2/3 TIME PASSED';
              console.log(`Sent reminder for task "${task.title}" (ID: ${task.id}) to ${assignee.email} [${urgency}]`);
            } catch (emailError: any) {
              console.error(`Failed to send email for task ${task.id} to ${assignee.email}:`, emailError.message);
            }
          }
          lastNotificationSent.set(notificationKey, now);
        }
      }
    }
    const { rows: completedTasks } = await sql`SELECT id FROM tasks WHERE status IN ('completed', 'verified')`;
    for (const t of completedTasks as any[]) lastNotificationSent.delete(t.id);
  } catch (error: any) {
    console.error('Error checking for expiring tasks:', error.message);
  }
}

function calculateNewDueDate(recurrenceType: string, _oldDueDate: string | null): string {
  const now = new Date();
  let newDate = new Date();
  switch (recurrenceType) {
    case 'daily':
      newDate.setHours(23, 59, 59, 0);
      break;
    case 'weekly':
      newDate.setDate(newDate.getDate() + 6);
      newDate.setHours(23, 59, 59, 0);
      break;
    case 'monthly':
      newDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;
    default:
      newDate.setHours(23, 59, 59, 0);
  }
  return newDate.toISOString();
}

async function processRecurrenceType(recurrenceType: string, periodKey: string) {
  try {
    const { rows: completedTasks } = await sql`
      SELECT * FROM tasks WHERE recurrence = ${recurrenceType} AND status IN ('completed', 'verified')
    `;
    if (completedTasks.length === 0) return;
    console.log(`Processing ${completedTasks.length} ${recurrenceType} recurring tasks...`);
    for (const task of completedTasks as any[]) {
      try {
        const newDueDate = calculateNewDueDate(recurrenceType, task.due_date);
        const result = await sql`
          INSERT INTO tasks (title, description, priority, organization_id, created_by, status, due_date, recurrence, estimated_time)
          VALUES (${task.title}, ${task.description}, ${task.priority}, ${task.organization_id}, ${task.created_by}, 'planned', ${newDueDate}, ${task.recurrence}, ${task.estimated_time})
          RETURNING id
        `;
        const newTaskId = (result.rows[0] as any).id;
        const { rows: assignees } = await sql`SELECT user_id FROM task_assignments WHERE task_id = ${task.id}`;
        for (const a of assignees as any[]) {
          await sql`INSERT INTO task_assignments (task_id, user_id) VALUES (${newTaskId}, ${a.user_id}) ON CONFLICT (task_id, user_id) DO NOTHING`;
        }
        const { rows: tags } = await sql`SELECT tag_id FROM task_tags WHERE task_id = ${task.id}`;
        for (const tag of tags as any[]) {
          await sql`INSERT INTO task_tags (task_id, tag_id) VALUES (${newTaskId}, ${tag.tag_id}) ON CONFLICT (task_id, tag_id) DO NOTHING`;
        }
        await sql`UPDATE tasks SET recurrence = 'once' WHERE id = ${task.id}`;
        console.log(`Recreated ${recurrenceType} task: "${task.title}" (old ID: ${task.id} -> new ID: ${newTaskId})`);
      } catch (taskError: any) {
        console.error(`Failed to recreate task ${task.id}:`, taskError.message);
      }
    }
  } catch (error: any) {
    console.error(`Error processing ${recurrenceType} recurring tasks:`, error.message);
  }
}

export async function processRecurringTasks() {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();
    const todayKey = now.toISOString().split('T')[0];
    const weekKey = `${now.getFullYear()}-W${Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    if (lastRecurringCheck.daily !== todayKey) {
      await processRecurrenceType('daily', todayKey);
      lastRecurringCheck.daily = todayKey;
    }
    if (dayOfWeek === 0 && lastRecurringCheck.weekly !== weekKey) {
      await processRecurrenceType('weekly', weekKey);
      lastRecurringCheck.weekly = weekKey;
    }
    if (dayOfMonth === 1 && lastRecurringCheck.monthly !== monthKey) {
      await processRecurrenceType('monthly', monthKey);
      lastRecurringCheck.monthly = monthKey;
    }
  } catch (error: any) {
    console.error('Error processing recurring tasks:', error.message);
  }
}

/** Delete tasks that have been in the last status (completed/verified) for more than 3 days. */
export async function cleanupOldCompletedTasks() {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString();
    // Use completed_at / verified_at for the 3-day cutoff (fallback to updated_at only for legacy tasks with NULL)
    const { rows: tasksToDelete } = await sql`
      SELECT id, title FROM tasks
      WHERE status IN ('completed', 'verified')
        AND (
          (status = 'completed' AND (completed_at < ${threeDaysAgoStr} OR (completed_at IS NULL AND updated_at < ${threeDaysAgoStr})))
          OR (status = 'verified' AND (verified_at < ${threeDaysAgoStr} OR (verified_at IS NULL AND COALESCE(completed_at, updated_at) < ${threeDaysAgoStr})))
        )
    `;
    if (tasksToDelete.length > 0) {
      const ids = (tasksToDelete as any[]).map((t) => t.id);
      for (const id of ids) {
        await sql`DELETE FROM task_tags WHERE task_id = ${id}`;
        await sql`DELETE FROM task_checklists WHERE task_id = ${id}`;
        await sql`DELETE FROM comments WHERE task_id = ${id}`;
        await sql`DELETE FROM photos WHERE task_id = ${id}`;
        await sql`DELETE FROM task_assignments WHERE task_id = ${id}`;
        await sql`DELETE FROM task_status_history WHERE task_id = ${id}`;
      }
      for (const id of ids) {
        await sql`DELETE FROM tasks WHERE id = ${id}`;
      }
      console.log(`Cleaned up ${tasksToDelete.length} old completed/verified tasks (in last status > 3 days ago)`);
    }
  } catch (error: any) {
    console.error('Error cleaning up old tasks:', error.message);
  }
}

/** Run once (e.g. on cron). No setInterval in serverless. */
export function startNotificationService() {
  checkForExpiringTasks();
  processRecurringTasks();
  cleanupOldCompletedTasks();
  console.log('Notification service run once (use cron for hourly).');
}

export function stopNotificationService(_intervalId?: NodeJS.Timeout) {
  console.log('Notification service stopped');
}
