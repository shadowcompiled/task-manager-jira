import express, { Request, Response } from 'express';
import { sql } from '../database';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken } from '../middleware';
import { sendUserApprovalEmail, sendUserDenialEmail } from '../services/emailService';

const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const { rows } = await sql`SELECT * FROM users WHERE email = ${email}`;
    const user = rows[0] as any;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
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

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, name, password, restaurantId } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, name, password' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    const role = 'worker';
    let finalRestaurantId = restaurantId ?? 1;

    if (!restaurantId) {
      const checkRestaurant = await sql`SELECT id FROM restaurants LIMIT 1`;
      if (checkRestaurant.rows.length > 0) {
        finalRestaurantId = (checkRestaurant.rows[0] as any).id;
      } else {
        const ins = await sql`INSERT INTO restaurants (name, location) VALUES (${'Restaurant - ' + Date.now()}, 'Not specified') RETURNING id`;
        finalRestaurantId = (ins.rows[0] as any).id;
      }
    }

    try {
      const result = await sql`
        INSERT INTO users (email, name, password, role, status, restaurant_id)
        VALUES (${email}, ${name}, ${hashedPassword}, ${role}, 'pending', ${finalRestaurantId})
        RETURNING *
      `;
      const created = result.rows[0] as any;
      if (!created) return res.status(500).json({ error: 'Failed to create user - no ID returned' });
      res.status(201).json({
        user: { ...created, password: undefined },
        message: `User ${name} registered successfully. Your account is pending admin approval.`
      });
    } catch (dbError: any) {
      console.error('Database error creating user:', dbError);
      if (dbError.message?.includes('unique') || dbError.code === '23505') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw dbError;
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + (error.message || 'Unknown error') });
  }
});

router.post('/promote', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized - token required' });
    let currentUser: any;
    try {
      currentUser = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }
    if (!['maintainer', 'admin'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only maintainers and admins can promote users' });
    }
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} AND restaurant_id = ${currentUser.restaurantId}`;
    const userToPromote = userRows.rows[0] as any;
    if (!userToPromote) {
      return res.status(404).json({ error: 'User not found or belongs to different restaurant' });
    }

    await sql`UPDATE users SET role = 'admin' WHERE id = ${userId}`;
    const updatedRows = await sql`SELECT * FROM users WHERE id = ${userId}`;
    const updatedUser = updatedRows.rows[0] as any;
    res.json({ user: { ...updatedUser, password: undefined }, message: 'User promoted to admin successfully' });
  } catch (error: any) {
    console.error('Promotion error:', error);
    res.status(500).json({ error: 'Promotion failed: ' + (error.message || 'Unknown error') });
  }
});

router.get('/pending-users', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized - token required' });
    let currentUser: any;
    try {
      currentUser = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }
    if (!['admin', 'maintainer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can view pending users' });
    }
    const { rows } = await sql`
      SELECT id, email, name, role, status, created_at FROM users
      WHERE restaurant_id = ${currentUser.restaurantId} AND status = 'pending'
      ORDER BY created_at DESC
    `;
    res.json({ pendingUsers: rows });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

router.put('/approve-user/:userId', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = req.params.userId;
    if (!token) return res.status(401).json({ error: 'Unauthorized - token required' });
    let currentUser: any;
    try {
      currentUser = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }
    if (!['admin', 'maintainer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can approve users' });
    }
    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} AND restaurant_id = ${currentUser.restaurantId}`;
    const userToApprove = userRows.rows[0] as any;
    if (!userToApprove) {
      return res.status(404).json({ error: 'User not found or belongs to different restaurant' });
    }
    await sql`UPDATE users SET status = 'approved' WHERE id = ${userId}`;
    const updatedRows = await sql`SELECT * FROM users WHERE id = ${userId}`;
    const updatedUser = updatedRows.rows[0] as any;
    await sendUserApprovalEmail(updatedUser.email, updatedUser.name);
    res.json({ user: { ...updatedUser, password: undefined }, message: `User ${updatedUser.email} approved successfully` });
  } catch (error: any) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Approval failed: ' + (error.message || 'Unknown error') });
  }
});

router.put('/deny-user/:userId', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const userId = req.params.userId;
    const { reason } = req.body;
    if (!token) return res.status(401).json({ error: 'Unauthorized - token required' });
    let currentUser: any;
    try {
      currentUser = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Unauthorized - invalid token' });
    }
    if (!['admin', 'maintainer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only admins and maintainers can deny users' });
    }
    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} AND restaurant_id = ${currentUser.restaurantId}`;
    const userToDeny = userRows.rows[0] as any;
    if (!userToDeny) {
      return res.status(404).json({ error: 'User not found or belongs to different restaurant' });
    }
    await sql`DELETE FROM users WHERE id = ${userId}`;
    await sendUserDenialEmail(userToDeny.email, userToDeny.name, reason || '');
    res.json({ message: `User ${userToDeny.email} registration denied`, emailSent: true });
  } catch (error: any) {
    console.error('Denial error:', error);
    res.status(500).json({ error: 'Denial failed: ' + (error.message || 'Unknown error') });
  }
});

export default router;
