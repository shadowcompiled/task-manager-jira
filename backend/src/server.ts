import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import dashboardRoutes from './routes/dashboard';
import statusRoutes from './routes/statuses';
import tagsRoutes from './routes/tags';
import pushRoutes from './routes/push';
import cronRoutes from './routes/cron';
import { verifyEmailConfig } from './services/emailService';
import { startNotificationService } from './services/notificationService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/cron', cronRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Run server only when not on Vercel (serverless handles requests via api/index.ts)
const isVercel = process.env.VERCEL === '1';
if (!isVercel) {
  (async () => {
    await initializeDatabase();
    verifyEmailConfig();
    startNotificationService();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })();
}

export default app;
