import express, { Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware';
import { getVapidPublicKey, saveSubscription, removeSubscription, sendNotificationToAll } from '../services/pushService';
import { sql } from '../database';

const router = express.Router();

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

router.post('/subscribe', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const subscription = req.body;
  if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription data' });
  }
  const success = await saveSubscription(userId, subscription);
  if (success) res.json({ message: 'Subscription saved successfully' });
  else res.status(500).json({ error: 'Failed to save subscription' });
});

router.post('/unsubscribe', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: 'Endpoint is required' });
  const success = await removeSubscription(endpoint);
  if (success) res.json({ message: 'Unsubscribed successfully' });
  else res.status(500).json({ error: 'Failed to unsubscribe' });
});

router.post('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const result = await sendNotificationToAll('🔔 התראת בדיקה', 'זוהי התראת בדיקה מהמערכת');
    res.json({ message: 'Test notification sent', ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

router.get('/users-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    const organizationId = req.user?.organizationId;
    const { rows: users } = await sql`
      SELECT u.id, u.name, u.email, u.role, u.status,
        (SELECT COUNT(*)::int FROM push_subscriptions ps WHERE ps.user_id = u.id) as subscription_count
      FROM users u WHERE u.organization_id = ${organizationId} ORDER BY u.name
    `;
    const result = (users as any[]).map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      notificationsEnabled: (user.subscription_count || 0) > 0,
      subscriptionCount: user.subscription_count || 0
    }));
    res.json({
      total: result.length,
      withNotifications: result.filter(u => u.notificationsEnabled).length,
      withoutNotifications: result.filter(u => !u.notificationsEnabled).length,
      users: result
    });
  } catch (error) {
    console.error('Error fetching users status:', error);
    res.status(500).json({ error: 'Failed to fetch users status' });
  }
});

export default router;
