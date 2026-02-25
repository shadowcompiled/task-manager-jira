import express, { Response } from 'express';
import { sql } from '../database';
import bcrypt from 'bcryptjs';
import { AuthRequest, authenticateToken } from '../middleware';

const router = express.Router();

const DEFAULT_STATUSES = [
  { name: 'planned', displayName: 'מתוכנן', color: '#9ca3af', order: 0 },
  { name: 'assigned', displayName: 'הוקצה', color: '#3b82f6', order: 1 },
  { name: 'in_progress', displayName: 'בתהליך', color: '#8b5cf6', order: 2 },
  { name: 'waiting', displayName: 'בהמתנה', color: '#f59e0b', order: 3 },
  { name: 'completed', displayName: 'הושלם', color: '#10b981', order: 4 },
];

/**
 * POST /api/organizations
 * Create a new organization and first admin user (self-serve signup).
 * Body: { name, location?, adminName, adminEmail, adminPassword }
 */
router.post('/', async (req: express.Request, res: Response) => {
  try {
    const { name, location, adminName, adminEmail, adminPassword } = req.body;
    if (!name || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({
        error: 'Missing required fields: name, adminName, adminEmail, adminPassword',
      });
    }

    const existingUser = await sql`SELECT id FROM users WHERE email = ${adminEmail}`;
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    const orgResult = await sql`
      INSERT INTO organizations (name, location)
      VALUES (${name}, ${location ?? null})
      RETURNING id, name, location, created_at
    `;
    const org = orgResult.rows[0] as any;
    const orgId = org.id;

    for (const s of DEFAULT_STATUSES) {
      await sql`
        INSERT INTO statuses (organization_id, name, display_name, color, order_index, is_default)
        VALUES (${orgId}, ${s.name}, ${s.displayName}, ${s.color}, ${s.order}, true)
      `;
    }

    const userResult = await sql`
      INSERT INTO users (email, name, password, role, status, organization_id)
      VALUES (${adminEmail}, ${adminName}, ${hashedPassword}, 'admin', 'approved', ${orgId})
      RETURNING id, email, name, role, status, organization_id, created_at
    `;
    const user = userResult.rows[0] as any;

    res.status(201).json({
      organization: { id: org.id, name: org.name, location: org.location, created_at: org.created_at },
      user: { ...user, password: undefined },
      message: 'Organization created. You can log in with your email and password.',
    });
  } catch (error: any) {
    console.error('Create organization error:', error);
    if (error.message?.includes('unique') || error.code === '23505') {
      return res.status(409).json({ error: 'Email or organization name conflict' });
    }
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/**
 * GET /api/organizations
 * List organizations the current user belongs to (requires auth).
 * For one-org-per-user, returns a single org.
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.json({ organizations: [] });
    }

    const { rows } = await sql`
      SELECT id, name, location, created_at
      FROM organizations
      WHERE id = ${organizationId}
    `;

    res.json({ organizations: rows });
  } catch (error: any) {
    console.error('List organizations error:', error);
    res.status(500).json({ error: 'Failed to list organizations' });
  }
});

export default router;
