import express, { Request, Response } from 'express';
import { checkForExpiringTasks, processRecurringTasks, cleanupOldCompletedTasks } from '../services/notificationService';
import { checkAndSendScheduledNotifications } from '../services/pushService';

const router = express.Router();
const CRON_SECRET = process.env.CRON_SECRET || '';

function requireCronSecret(req: Request, res: Response, next: () => void) {
  const auth = req.headers.authorization;
  const secret = auth?.replace(/^Bearer\s+/i, '') || req.headers['x-cron-secret'];
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

router.get('/daily-notifications', requireCronSecret, async (_req, res) => {
  try {
    await checkForExpiringTasks();
    await processRecurringTasks();
    await cleanupOldCompletedTasks();
    res.json({ ok: true, message: 'Daily notifications run' });
  } catch (error: any) {
    console.error('Cron daily-notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/push-scheduled', requireCronSecret, async (_req, res) => {
  try {
    const result = await checkAndSendScheduledNotifications();
    res.json({
      ok: true,
      message: 'Push scheduled check run',
      ...result,
      _hint: result.subscriptionCount === 0
        ? 'No push subscriptions in DB. Open the app on the device, enable notifications, and accept the browser prompt.'
        : (result.pushFailCount && result.pushFailCount > 0)
          ? 'Some pushes failed (expired/invalid subscription). Users may need to re-enable notifications in the app.'
          : 'Slot = Israel hour 10/13/20. On phone: use the app (PWA) and allow notifications for that device.'
    });
  } catch (error: any) {
    console.error('Cron push-scheduled error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
