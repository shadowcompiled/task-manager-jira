import webpush from 'web-push';
import db from '../database';

// VAPID keys - you should set these in environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BDVge7vM17zFt4KRNYL6ec7T5pBwWjy_i2adO0GjDOod__enfciamu0xMMvWe4zvmpSezX0f2yrOS2fda_y2so0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'gAO5WkFKYPFnzi29couSWxJKAIQuiArZcPphSGeq-xI';
const VAPID_EMAIL = process.env.EMAIL_FROM || 'mailto:admin@example.com';

// Configure web-push
webpush.setVapidDetails(
  VAPID_EMAIL,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export const getVapidPublicKey = () => VAPID_PUBLIC_KEY;

// Save subscription to database
export const saveSubscription = (userId: number, subscription: any) => {
  const { endpoint, keys } = subscription;
  
  try {
    // Delete existing subscription for this endpoint (if any)
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
    
    // Insert new subscription
    db.prepare(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
    `).run(userId, endpoint, keys.p256dh, keys.auth);
    
    console.log(`✅ Push subscription saved for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return false;
  }
};

// Remove subscription from database
export const removeSubscription = (endpoint: string) => {
  try {
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
    console.log('✅ Push subscription removed');
    return true;
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return false;
  }
};

// Send notification to a specific user
export const sendNotificationToUser = async (userId: number, title: string, body: string, icon?: string) => {
  const subscriptions = db.prepare(`
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?
  `).all(userId) as any[];

  const payload = JSON.stringify({
    title,
    body,
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'task-reminder',
    requireInteraction: true
  });

  let successCount = 0;
  let failCount = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
      successCount++;
    } catch (error: any) {
      failCount++;
      console.error(`Push notification failed for endpoint ${sub.endpoint}:`, error.message);
      
      // Remove invalid subscriptions (expired or unsubscribed)
      if (error.statusCode === 404 || error.statusCode === 410) {
        removeSubscription(sub.endpoint);
      }
    }
  }

  return { successCount, failCount };
};

// Send notification to all users
export const sendNotificationToAll = async (title: string, body: string, icon?: string) => {
  const subscriptions = db.prepare(`
    SELECT endpoint, p256dh, auth FROM push_subscriptions
  `).all() as any[];

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

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
      successCount++;
    } catch (error: any) {
      failCount++;
      
      // Remove invalid subscriptions
      if (error.statusCode === 404 || error.statusCode === 410) {
        removeSubscription(sub.endpoint);
      }
    }
  }

  console.log(`📲 Push notifications sent: ${successCount} success, ${failCount} failed`);
  return { successCount, failCount };
};

// Scheduled notification sender
let morningNotificationSent = false;
let eveningNotificationSent = false;

export const checkAndSendScheduledNotifications = async () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  // Reset flags at midnight
  if (hours === 0 && minutes < 5) {
    morningNotificationSent = false;
    eveningNotificationSent = false;
  }

  // Morning notification at 9:00
  if (hours === 9 && minutes < 5 && !morningNotificationSent) {
    console.log('📲 Sending morning notification...');
    await sendNotificationToAll(
      '☀️ בוקר טוב!',
      'לא לשכוח לבצע את המשימות!'
    );
    morningNotificationSent = true;
  }

  // Evening notification at 22:00
  if (hours === 22 && minutes < 5 && !eveningNotificationSent) {
    console.log('📲 Sending evening notification...');
    await sendNotificationToAll(
      '🌙 לילה טוב!',
      'לא לשכוח לתקף משימות שביצעת!'
    );
    eveningNotificationSent = true;
  }
};

// Start scheduler (runs every minute)
export const startPushScheduler = () => {
  console.log('📲 Push notification scheduler started');
  
  // Check immediately
  checkAndSendScheduledNotifications();
  
  // Then check every minute
  setInterval(checkAndSendScheduledNotifications, 60 * 1000);
};
