import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database';
import { seedDatabase } from './seed';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import dashboardRoutes from './routes/dashboard';
import statusRoutes from './routes/statuses';
import tagsRoutes from './routes/tags';
import { verifyEmailConfig } from './services/emailService';
import { startNotificationService } from './services/notificationService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
try {
  initializeDatabase();
  
  // Check if database is empty and seed if needed
  const db = require('./database').default;
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    seedDatabase();
  }
} catch (error) {
  console.error('Database initialization error:', error);
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/tags', tagsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  
  // Verify email configuration
  verifyEmailConfig();
  
  // Start background notification service
  startNotificationService();
  
  console.log(`📚 API Documentation:`);
  console.log(`   POST /api/auth/register - Register new user`);
  console.log(`   POST /api/auth/login - Login user`);
  console.log(`   GET /api/tasks - Get all tasks`);
  console.log(`   POST /api/tasks - Create task`);
  console.log(`   PUT /api/tasks/:id - Update task`);
  console.log(`   PUT /api/tasks/:id/complete - Mark task complete`);
  console.log(`   PUT /api/tasks/:id/verify - Verify task completion`);
  console.log(`   GET /api/dashboard/stats/overview - Get dashboard stats`);
  console.log(`   GET /api/statuses/restaurant/:id - Get restaurant statuses`);
  console.log(`   POST /api/statuses - Create status (admin only)`);
  console.log(`   PUT /api/statuses/:id - Update status (admin only)`);
  console.log(`   DELETE /api/statuses/:id - Delete status (admin only)`);
  console.log(`   GET /api/tags/restaurant/:id - Get restaurant tags`);
  console.log(`   POST /api/tags - Create tag (manager/admin)`);
  console.log(`   PUT /api/tags/:id - Update tag (manager/admin)`);
  console.log(`   DELETE /api/tags/:id - Delete tag (manager/admin)`);
});
