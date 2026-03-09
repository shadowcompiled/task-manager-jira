import webpush from 'web-push';
import { sql } from '../database';

// VAPID keys - you should set these in environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDVge7vM17zFt4KRNYL6ec7T5pBwWjy_i2adO0GjDOod__enfciamu0xMMvWe4zvmpSezX0f2yrOS2fda_y2so0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'gAO5WkFKYPFnzi29couSWxJKAIQuiArZcPphSGeq-xI';

// VAPID subject must be a mailto: URL
const getVapidSubject = () => {
  const email = process.env.EMAIL_FROM || 'admin@example.com';
  return email.startsWith('mailto:') ? email : `mailto:${email}`;
};

// Configure web-push
webpush.setVapidDetails(
  getVapidSubject(),
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export const getVapidPublicKey = () => VAPID_PUBLIC_KEY;

export async function saveSubscription(userId: number, subscription: any): Promise<boolean> {
  const { endpoint, keys } = subscription;
  try {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
    await sql`INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (${userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth})`;
    console.log(`✅ Push subscription saved for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
}

export async function removeSubscription(endpoint: string): Promise<boolean> {
  try {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
    console.log('✅ Push subscription removed');
    return true;
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return false;
  }
}

export async function sendNotificationToUser(userId: number, title: string, body: string, icon?: string, tag?: string): Promise<{ successCount: number; failCount: number }> {
  const uid = Number(userId);
  const { rows: subscriptions } = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${uid}`;

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: tag || 'task-reminder',
    requireInteraction: true
  });

  let successCount = 0;
  let failCount = 0;

  for (const sub of subscriptions as any[]) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      successCount++;
    } catch (error: any) {
      failCount++;
      console.error(`Push notification failed for endpoint ${sub.endpoint}:`, error.message);
      if (error.statusCode === 404 || error.statusCode === 410) await removeSubscription(sub.endpoint);
    }
  }
  if (tag === 'mission-assigned') {
    console.log(`📲 Assignment push: user ${uid}, subscriptions: ${(subscriptions as any[]).length}, sent: ${successCount}, failed: ${failCount}`);
  }
  return { successCount, failCount };
}

export async function sendNotificationToAll(title: string, body: string, icon?: string): Promise<{ successCount: number; failCount: number }> {
  const { rows: subscriptions } = await sql`SELECT endpoint, p256dh, auth FROM push_subscriptions`;

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'daily-reminder',
    requireInteraction: false
  });

  let successCount = 0;
  let failCount = 0;

  for (const sub of subscriptions as any[]) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
      successCount++;
    } catch (error: any) {
      failCount++;
      if (error.statusCode === 404 || error.statusCode === 410) await removeSubscription(sub.endpoint);
    }
  }
  console.log(`📲 Push notifications sent: ${successCount} success, ${failCount} failed`);
  return { successCount, failCount };
}

// Get Israel time (UTC+2 or UTC+3 depending on DST)
const getIsraelTime = () => {
  const now = new Date();
  const israelTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  const y = israelTime.getFullYear();
  const m = String(israelTime.getMonth() + 1).padStart(2, '0');
  const d = String(israelTime.getDate()).padStart(2, '0');
  const sentDate = `${y}-${m}-${d}`;
  return {
    hours: israelTime.getHours(),
    minutes: israelTime.getMinutes(),
    sentDate,
  };
};

/** Send push to assignees for tasks whose due_date is due right now (within last 2 min). Runs when cron hits every minute. */
export const checkAndSendTaskDueNowNotifications = async () => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 2 * 60 * 1000); // 2 min ago
  const nowStr = now.toISOString();
  const windowStr = windowStart.toISOString();
  const { rows: tasks } = await sql`
    SELECT t.id, t.title, t.due_date, t.assigned_to
    FROM tasks t
    WHERE t.due_date IS NOT NULL
      AND t.due_date <= ${nowStr}
      AND t.due_date >= ${windowStr}
      AND t.push_reminder_sent_at IS NULL
      AND t.status NOT IN ('completed', 'verified')
  `;
  for (const task of tasks as any[]) {
    const { rows: assigneeRows } = await sql`
      SELECT user_id FROM task_assignments WHERE task_id = ${task.id}
    `;
    const userIds = (assigneeRows as any[]).map((r) => r.user_id);
    if (userIds.length === 0 && task.assigned_to) userIds.push(task.assigned_to);
    if (userIds.length === 0) continue;
    for (const userId of userIds) {
      await sendNotificationToUser(
        userId,
        '⏰ משימה בשל',
        task.title,
        undefined,
        'task-due-now'
      );
    }
    await sql`UPDATE tasks SET push_reminder_sent_at = CURRENT_TIMESTAMP WHERE id = ${task.id}`;
    console.log(`📲 Due-now push sent for task "${task.title}" (ID: ${task.id})`);
  }
};

async function wasSlotSentToday(slot: string, sentDate: string): Promise<boolean> {
  const { rows } = await sql`
    SELECT 1 FROM push_sent_log WHERE slot = ${slot} AND sent_date = ${sentDate}::date LIMIT 1
  `;
  return rows.length > 0;
}

async function markSlotSent(slot: string, sentDate: string): Promise<void> {
  await sql`
    INSERT INTO push_sent_log (slot, sent_date) VALUES (${slot}, ${sentDate}::date)
    ON CONFLICT (slot, sent_date) DO NOTHING
  `;
}

let pushSentLogTableEnsured = false;
async function ensurePushSentLogTable(): Promise<void> {
  if (pushSentLogTableEnsured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS push_sent_log (
        id SERIAL PRIMARY KEY,
        slot TEXT NOT NULL CHECK (slot IN ('morning', 'noon', 'evening')),
        sent_date DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(slot, sent_date)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_push_sent_log_slot_date ON push_sent_log(slot, sent_date)`;
    pushSentLogTableEnsured = true;
  } catch (e) {
    console.error('[pushService] ensurePushSentLogTable:', e);
  }
}

export const checkAndSendScheduledNotifications = async () => {
  await checkAndSendTaskDueNowNotifications();
  await ensurePushSentLogTable();
  const { hours, minutes, sentDate } = getIsraelTime();

  // Morning notification at 9:00 Israel time (window 9:00–9:04)
  if (hours === 9 && minutes < 5) {
    if (!(await wasSlotSentToday('morning', sentDate))) {
      console.log(`📲 Sending morning notification... (Israel date: ${sentDate})`);
      const result = await sendNotificationToAll(
        '☀️ בוקר טוב!',
        'לא לשכוח לבצע את המשימות!'
      );
      console.log(`📲 Morning notification result:`, result);
      await markSlotSent('morning', sentDate);
    }
  }

  // Noon notification at 12:30 Israel time (window 12:30–12:34)
  if (hours === 12 && minutes >= 30 && minutes < 35) {
    if (!(await wasSlotSentToday('noon', sentDate))) {
      console.log(`📲 Sending noon notification... (Israel date: ${sentDate})`);
      const result = await sendNotificationToAll(
        '🍽️ שתיהיה משמרת מוצלחת!',
        'הסתכלת על המשימות שלך?'
      );
      console.log(`📲 Noon notification result:`, result);
      await markSlotSent('noon', sentDate);
    }
  }

  // Evening notification at 22:00 Israel time (window 22:00–22:04)
  if (hours === 22 && minutes < 5) {
    if (!(await wasSlotSentToday('evening', sentDate))) {
      console.log(`📲 Sending evening notification... (Israel date: ${sentDate})`);
      const result = await sendNotificationToAll(
        '🌙 לילה טוב!',
        'לא לשכוח לתקף משימות שביצעת!'
      );
      console.log(`📲 Evening notification result:`, result);
      await markSlotSent('evening', sentDate);
    }
  }
};

// Start scheduler (runs every minute)
export const startPushScheduler = () => {
  const { hours, minutes } = getIsraelTime();
  console.log(`📲 Push notification scheduler started (Israel time: ${hours}:${String(minutes).padStart(2, '0')})`);
  console.log(`📲 Morning notification scheduled for 9:00 Israel time`);
  console.log(`📲 Noon notification scheduled for 12:30 Israel time`);
  console.log(`📲 Evening notification scheduled for 22:00 Israel time`);
  
  // Check immediately
  checkAndSendScheduledNotifications();
  
  // Then check every minute
  setInterval(checkAndSendScheduledNotifications, 60 * 1000);
};
