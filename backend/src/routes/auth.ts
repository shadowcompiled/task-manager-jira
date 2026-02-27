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
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, name, password' });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Organization: never trust client. Use token's org when admin/maintainer creates user, else first org or create for first user.
    let finalOrganizationId: number;
    let isAdminCreating = false;
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (token) {
      try {
        const decoded = verifyToken(token) as any;
        const roleDecoded = decoded.role;
        const orgId = decoded.organizationId ?? decoded.restaurant_id;
        if ((roleDecoded === 'admin' || roleDecoded === 'maintainer') && orgId) {
          finalOrganizationId = Number(orgId);
          isAdminCreating = true;
        } else {
          const first = await sql`SELECT id FROM organizations ORDER BY id LIMIT 1`;
          finalOrganizationId = first.rows.length > 0 ? (first.rows[0] as any).id : 1;
        }
      } catch {
        const first = await sql`SELECT id FROM organizations ORDER BY id LIMIT 1`;
        finalOrganizationId = first.rows.length > 0 ? (first.rows[0] as any).id : 1;
      }
    } else {
      const checkOrg = await sql`SELECT id FROM organizations ORDER BY id LIMIT 1`;
      if (checkOrg.rows.length > 0) {
        finalOrganizationId = (checkOrg.rows[0] as any).id;
      } else {
        const ins = await sql`INSERT INTO organizations (name, location) VALUES (${'Organization - ' + Date.now()}, 'Not specified') RETURNING id`;
        finalOrganizationId = (ins.rows[0] as any).id;
        const defaultStatuses = [
          { name: 'planned', displayName: 'מתוכנן', color: '#9ca3af', order: 0 },
          { name: 'assigned', displayName: 'הוקצה', color: '#3b82f6', order: 1 },
          { name: 'in_progress', displayName: 'בתהליך', color: '#8b5cf6', order: 2 },
          { name: 'waiting', displayName: 'בהמתנה', color: '#f59e0b', order: 3 },
          { name: 'completed', displayName: 'הושלם', color: '#10b981', order: 4 },
        ];
        for (const s of defaultStatuses) {
          await sql`INSERT INTO statuses (organization_id, name, display_name, color, order_index, is_default) VALUES (${finalOrganizationId}, ${s.name}, ${s.displayName}, ${s.color}, ${s.order}, true)`;
        }
      }
    }

    const userCount = await sql`SELECT COUNT(*)::int as n FROM users`;
    const isFirstUser = (userCount.rows[0] as any)?.n === 0;
    let role: string = isFirstUser ? 'admin' : 'worker';
    let status: string = isFirstUser ? 'approved' : 'pending';
    if (isAdminCreating) {
      const bodyRole = req.body.role as string | undefined;
      if (bodyRole === 'admin') role = 'admin';
      else if (bodyRole === 'manager') role = 'maintainer';
      else if (bodyRole === 'staff') role = 'worker';
      status = 'approved';
    }

    try {
      const result = await sql`
        INSERT INTO users (email, name, password, role, status, organization_id)
        VALUES (${email}, ${name}, ${hashedPassword}, ${role}, ${status}, ${finalOrganizationId})
        RETURNING *
      `;
      const created = result.rows[0] as any;
      if (!created) return res.status(500).json({ error: 'Failed to create user - no ID returned' });
      res.status(201).json({
        user: { ...created, password: undefined },
        message: isFirstUser
          ? `Welcome, ${name}. You are the first user and have been set as admin. You can log in now.`
          : `User ${name} registered successfully. Your account is pending admin approval.`
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

    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} AND organization_id = ${currentUser.organizationId}`;
    const userToPromote = userRows.rows[0] as any;
    if (!userToPromote) {
      return res.status(404).json({ error: 'User not found or belongs to different organization' });
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
    if (!['admin', 'maintainer', 'manager'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only admins, maintainers and managers can view pending users' });
    }
    const { rows } = await sql`
      SELECT id, email, name, role, status, created_at FROM users
      WHERE organization_id = ${currentUser.organizationId} AND status = 'pending'
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
    if (!['admin', 'maintainer', 'manager'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only admins, maintainers and managers can approve users' });
    }
    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} AND organization_id = ${currentUser.organizationId}`;
    const userToApprove = userRows.rows[0] as any;
    if (!userToApprove) {
      return res.status(404).json({ error: 'User not found or belongs to different organization' });
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
    if (!['admin', 'maintainer', 'manager'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only admins, maintainers and managers can deny users' });
    }
    const userRows = await sql`SELECT * FROM users WHERE id = ${userId} AND organization_id = ${currentUser.organizationId}`;
    const userToDeny = userRows.rows[0] as any;
    if (!userToDeny) {
      return res.status(404).json({ error: 'User not found or belongs to different organization' });
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
