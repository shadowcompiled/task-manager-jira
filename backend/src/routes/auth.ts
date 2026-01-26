import express, { Request, Response } from 'express';
import db from '../database';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../middleware';
import { 
  sendUserApprovalEmail, 
  sendUserDenialEmail,
  sendNewUserRegistrationNotification,
  sendRegistrationPendingEmail 
} from '../services/emailService';

const router = express.Router();

// Login endpoint - public
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

    if (!user || !bcrypt.compareSync(password, user.password as string)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user status is pending
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending admin approval. Please wait for confirmation.' });
    }

    const token = generateToken(user);
    res.json({ user: { ...user, password: undefined }, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register endpoint - PUBLIC SIGNUP with worker role by default
// If called by admin with token, can set custom role and auto-approve
router.post('/register', (req: Request, res: Response) => {
  try {
    const { email, name, password, restaurantId, role: requestedRole } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, name, password' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    // Check if admin is creating the user (has valid token)
    let isAdminCreating = false;
    let adminUser: any = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        adminUser = verifyToken(token);
        if (['admin', 'maintainer'].includes(adminUser.role)) {
          isAdminCreating = true;
        }
      } catch (e) {
        // Token invalid, treat as public signup
      }
    }

    // If admin is creating user, use requested role; otherwise default to 'worker'
    const validRoles = ['admin', 'maintainer', 'worker'];
    let role = 'worker';
    if (isAdminCreating && requestedRole && validRoles.includes(requestedRole)) {
      role = requestedRole;
    }

    // If admin is creating, auto-approve; otherwise pending
    const status = isAdminCreating ? 'approved' : 'pending';

    let finalRestaurantId = restaurantId || 1; // Default to first restaurant

    // If restaurant doesn't exist, create one
    if (!restaurantId) {
      try {
        const checkRestaurant = db.prepare('SELECT id FROM restaurants LIMIT 1').get() as any;
        if (checkRestaurant) {
          finalRestaurantId = checkRestaurant.id;
        } else {
          const restaurantStmt = db.prepare(`
            INSERT INTO restaurants (name, location)
            VALUES (?, ?)
          `);
          const restaurantResult = restaurantStmt.run(`Restaurant - ${new Date().getTime()}`, 'Not specified');
          finalRestaurantId = Number(restaurantResult.lastInsertRowid);
        }
      } catch (dbError) {
        console.error('Error with restaurant:', dbError);
        finalRestaurantId = 1;
      }
    }

    // Insert user
    try {
      const stmt = db.prepare(`
        INSERT INTO users (email, name, password, role, status, restaurant_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(email, name, hashedPassword, role, status, finalRestaurantId);
      const userId = Number(result.lastInsertRowid);

      if (!userId) {
        return res.status(500).json({ error: 'Failed to create user - no ID returned' });
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

      if (!user) {
        return res.status(500).json({ error: 'Failed to retrieve created user' });
      }

      const message = isAdminCreating 
        ? `User ${name} created successfully with role: ${role}`
        : `User ${name} registered successfully. Your account is pending admin approval.`;

      // If public signup, send email notifications
      if (!isAdminCreating) {
        // Send email to the new user
        sendRegistrationPendingEmail(email, name).catch(console.error);

        // Send email to all admins/maintainers about the new registration
        const admins = db.prepare(`
          SELECT email FROM users 
          WHERE restaurant_id = ? AND role IN ('admin', 'maintainer') AND status = 'approved'
        `).all(finalRestaurantId) as any[];

        for (const admin of admins) {
          sendNewUserRegistrationNotification(admin.email, name, email).catch(console.error);
        }
      }

      res.status(201).json({ 
        user: { ...user, password: undefined },
        message
      });
    } catch (dbError: any) {
      console.error('Database error creating user:', dbError);
      if (dbError.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + (error.message || 'Unknown error') });
  }
});

// Promote user to admin - ADMIN or MANAGER only
router.post('/promote', (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - token required' });
    }

    let currentUser: any;
    try {
      currentUser = verifyToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }

    // Allow maintainer and admin to promote
    if (!['maintainer', 'admin'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only maintainers and admins can promote users' });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Get user to promote
    const userToPromote = db.prepare('SELECT * FROM users WHERE id = ? AND restaurant_id = ?').get(userId, currentUser.restaurantId) as any;

    if (!userToPromote) {
      return res.status(404).json({ error: 'User not found or belongs to different restaurant' });
    }

    // Update role to admin
    const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
    stmt.run('admin', userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    res.json({ 
      user: { ...updatedUser, password: undefined },
      message: `User promoted to admin successfully` 
    });
  } catch (error: any) {
    console.error('Promotion error:', error);
    res.status(500).json({ error: 'Promotion failed: ' + (error.message || 'Unknown error') });
  }
});

// Get pending users - ADMIN only
router.get('/pending-users', (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - token required' });
    }

    let currentUser: any;
    try {
      currentUser = verifyToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }

    // Only admins and maintainers can view pending users
    if (!['admin', 'maintainer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can view pending users' });
    }

    const pendingUsers = db.prepare(`
      SELECT id, email, name, role, status, created_at 
      FROM users 
      WHERE restaurant_id = ? AND status = 'pending'
      ORDER BY created_at DESC
    `).all(currentUser.restaurantId) as any[];

    res.json({ pendingUsers });
  } catch (error: any) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Approve user - ADMIN only
router.put('/approve-user/:userId', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { userId } = req.params;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - token required' });
    }

    let currentUser: any;
    try {
      currentUser = verifyToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }

    // Only admins and maintainers can approve users
    if (!['admin', 'maintainer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can approve users' });
    }

    // Get user to approve
    const userToApprove = db.prepare('SELECT * FROM users WHERE id = ? AND restaurant_id = ?').get(userId, currentUser.restaurantId) as any;

    if (!userToApprove) {
      return res.status(404).json({ error: 'User not found or belongs to different restaurant' });
    }

    // Update user status to approved
    const stmt = db.prepare('UPDATE users SET status = ? WHERE id = ?');
    stmt.run('approved', userId);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    // Send approval email
    await sendUserApprovalEmail(updatedUser.email, updatedUser.name);

    res.json({ 
      user: { ...updatedUser, password: undefined },
      message: `User ${updatedUser.email} approved successfully` 
    });
  } catch (error: any) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Approval failed: ' + (error.message || 'Unknown error') });
  }
});

// Deny user registration - ADMIN and MAINTAINER only
router.put('/deny-user/:userId', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { userId } = req.params;
    const { reason } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - token required' });
    }

    let currentUser: any;
    try {
      currentUser = verifyToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }

    // Only admins and maintainers can deny users
    if (!['admin', 'maintainer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can deny users' });
    }

    // Get user to deny
    const userToDeny = db.prepare('SELECT * FROM users WHERE id = ? AND restaurant_id = ?').get(userId, currentUser.restaurantId) as any;

    if (!userToDeny) {
      return res.status(404).json({ error: 'User not found or belongs to different restaurant' });
    }

    // Delete the user (or mark as rejected)
    const deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
    deleteStmt.run(userId);

    // Send denial email
    await sendUserDenialEmail(userToDeny.email, userToDeny.name, reason || '');

    res.json({ 
      message: `User ${userToDeny.email} registration denied`,
      emailSent: true
    });
  } catch (error: any) {
    console.error('Denial error:', error);
    res.status(500).json({ error: 'Denial failed: ' + (error.message || 'Unknown error') });
  }
});
export default router;