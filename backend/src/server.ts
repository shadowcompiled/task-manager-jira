import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database';
import { runMigrationIfNeeded } from './db/migrate';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import dashboardRoutes from './routes/dashboard';
import statusRoutes from './routes/statuses';
import tagsRoutes from './routes/tags';
import pushRoutes from './routes/push';
import cronRoutes from './routes/cron';
import organizationsRoutes from './routes/organizations';
import { verifyEmailConfig } from './services/emailService';
import { startNotificationService } from './services/notificationService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: allow Vercel frontend; set CORS_ORIGIN (comma-separated) to override/add origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
  : [
      'https://task-manager-jira.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
}

// CORS headers on every response (first middleware so errors still get headers)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(cors({
  origin: (o, cb) => cb(null, !o || isOriginAllowed(o)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Ensure migration has run (for Vercel serverless where initializeDatabase is not called on boot)
app.use('/api', (req, res, next) => {
  runMigrationIfNeeded()
    .then(() => next())
    .catch((err) => {
      console.error('Migration failed:', err);
      res.status(503).json({ error: 'Database migration in progress or failed. Please retry.' });
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/organizations', organizationsRoutes);

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
