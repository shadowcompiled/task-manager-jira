import express, { Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware';
import { 
  getVapidPublicKey, 
  saveSubscription, 
  removeSubscription,
  sendNotificationToAll 
} from '../services/pushService';

const router = express.Router();

// Get VAPID public key (for frontend to subscribe)
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const subscription = req.body;

  if (!userId || !subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: 'Invalid subscription data' });
  }

  const success = saveSubscription(userId, subscription);
  
  if (success) {
    res.json({ message: 'Subscription saved successfully' });
  } else {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  const success = removeSubscription(endpoint);
  
  if (success) {
    res.json({ message: 'Unsubscribed successfully' });
  } else {
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Test notification (admin only)
router.post('/test', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }

  try {
    const result = await sendNotificationToAll(
      '🔔 התראת בדיקה',
      'זוהי התראת בדיקה מהמערכת'
    );
    res.json({ message: 'Test notification sent', ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
