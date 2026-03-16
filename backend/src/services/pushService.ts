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

const TZ_ISRAEL = 'Asia/Jerusalem';

/** Get current time and date in Israel using Intl (reliable on serverless/UTC). */
function getIsraelTime(now: Date = new Date()): { hours: number; minutes: number; dateStr: string; sentDate: string } {
  const hourFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ_ISRAEL, hour: 'numeric', hour12: false });
  const minuteFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ_ISRAEL, minute: 'numeric' });
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ_ISRAEL, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  const sentDate = `${get('year')}-${get('month')}-${get('day')}`; // YYYY-MM-DD for DB
  const hours = parseInt(hourFmt.format(now), 10);
  const minutes = parseInt(minuteFmt.format(now), 10);
  return { hours, minutes, dateStr: sentDate, sentDate };
}

/** Return true if this slot was already sent for the given Israel date (YYYY-MM-DD). */
async function wasScheduledPushSent(slot: string, sentDate: string): Promise<boolean> {
  const { rows } = await sql`
    SELECT 1 FROM scheduled_push_log WHERE slot = ${slot} AND sent_date = ${sentDate} LIMIT 1
  `;
  return rows.length > 0;
}

/** Record that we sent the scheduled push for this slot and date (YYYY-MM-DD). */
async function recordScheduledPushSent(slot: string, sentDate: string): Promise<void> {
  await sql`
    INSERT INTO scheduled_push_log (slot, sent_date) VALUES (${slot}, ${sentDate})
    ON CONFLICT (slot, sent_date) DO NOTHING
  `;
}

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

export const checkAndSendScheduledNotifications = async (): Promise<{ slot?: string; sent: boolean; israelHour: number; israelDate: string }> => {
  await checkAndSendTaskDueNowNotifications();

  const { hours, minutes, sentDate } = getIsraelTime();
  const israelHour = hours;

  // Morning notification at 10:00 Israel time (full hour window — dedup via scheduled_push_log)
  if (hours === 10) {
    const alreadySent = await wasScheduledPushSent('morning', sentDate);
    if (!alreadySent) {
      console.log(`📲 Sending morning notification... (Israel date: ${sentDate})`);
      await sendNotificationToAll('☀️ בוקר טוב!', 'לא לשכוח לבצע את המשימות!');
      await recordScheduledPushSent('morning', sentDate);
      return { slot: 'morning', sent: true, israelHour, israelDate: sentDate };
    }
    return { slot: 'morning', sent: false, israelHour, israelDate: sentDate };
  }

  // Noon notification at 13:00 Israel time (full hour window — dedup via scheduled_push_log)
  if (hours === 13) {
    const alreadySent = await wasScheduledPushSent('noon', sentDate);
    if (!alreadySent) {
      console.log(`📲 Sending noon notification... (Israel date: ${sentDate})`);
      await sendNotificationToAll('🍽️ שתיהיה משמרת מוצלחת!', 'הסתכלת על המשימות שלך?');
      await recordScheduledPushSent('noon', sentDate);
      return { slot: 'noon', sent: true, israelHour, israelDate: sentDate };
    }
    return { slot: 'noon', sent: false, israelHour, israelDate: sentDate };
  }

  // Evening notification at 20:00 Israel time (full hour window — dedup via scheduled_push_log)
  if (hours === 20) {
    const alreadySent = await wasScheduledPushSent('evening', sentDate);
    if (!alreadySent) {
      console.log(`📲 Sending evening notification... (Israel date: ${sentDate})`);
      await sendNotificationToAll('🌙 לילה טוב!', 'לא לשכוח לתקף משימות שביצעת!');
      await recordScheduledPushSent('evening', sentDate);
      return { slot: 'evening', sent: true, israelHour, israelDate: sentDate };
    }
    return { slot: 'evening', sent: false, israelHour, israelDate: sentDate };
  }

  return { sent: false, israelHour, israelDate: sentDate };
};

// Start scheduler (runs every minute)
export const startPushScheduler = () => {
  const { hours, minutes } = getIsraelTime();
  console.log(`📲 Push notification scheduler started (Israel time: ${hours}:${String(minutes).padStart(2, '0')})`);
  console.log(`📲 Morning notification scheduled for 10:00 Israel time`);
  console.log(`📲 Noon notification scheduled for 13:00 Israel time`);
  console.log(`📲 Evening notification scheduled for 20:00 Israel time`);
  
  // Check immediately
  checkAndSendScheduledNotifications();
  
  // Then check every minute
  setInterval(checkAndSendScheduledNotifications, 60 * 1000);
};
