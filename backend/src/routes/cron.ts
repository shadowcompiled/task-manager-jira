import express, { Request, Response } from 'express';
import { checkForExpiringTasks, processRecurringTasks, cleanupOldCompletedTasks } from '../services/notificationService';
import { checkAndSendScheduledNotifications, sendScheduledSlot } from '../services/pushService';

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

router.get('/push-scheduled', requireCronSecret, async (req: Request, res) => {
  try {
    const slot = (req.query.slot as string)?.toLowerCase();
    const validSlots = ['morning', 'noon', 'evening'];
    const result = validSlots.includes(slot)
      ? await sendScheduledSlot(slot as 'morning' | 'noon' | 'evening')
      : await checkAndSendScheduledNotifications();

    const hint = result.subscriptionCount === 0
      ? 'No push subscriptions in DB. Open the app on the device, enable notifications, and accept the browser prompt.'
      : (result.pushFailCount && result.pushFailCount > 0)
        ? 'Some pushes failed (expired/invalid subscription). Users may need to re-enable notifications in the app.'
        : result.slot
          ? (result.sent ? 'Reminder sent.' : 'Slot already sent today (once per day per slot).')
          : 'Use ?slot=morning|noon|evening so cron jobs do not depend on exact time or DST. No time filter when slot is set.';
    res.json({
      ok: true,
      message: 'Push scheduled check run',
      ...result,
      _hint: hint,
      _usage: 'GET /api/cron/push-scheduled?slot=morning | ?slot=noon | ?slot=evening — set 3 cron-job.org jobs at your desired UTC times (e.g. 8, 11, 18) with the same URL and different ?slot=; each slot sent at most once per Israel day.'
    });
  } catch (error: any) {
    console.error('Cron push-scheduled error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
