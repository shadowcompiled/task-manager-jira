import { sql } from './database';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  const r1 = await sql`INSERT INTO restaurants (name, location) VALUES ('פיצריה דאונטאון', 'רחוב הראשי 123') RETURNING id`;
  const r2 = await sql`INSERT INTO restaurants (name, location) VALUES ('ביסטרו עלית', 'שדרות האלון 456') RETURNING id`;
  const restaurant1Id = (r1.rows[0] as any).id;
  const restaurant2Id = (r2.rows[0] as any).id;

  const defaultStatuses = [
    { name: 'planned', displayName: 'מתוכנן', color: '#9ca3af', order: 0 },
    { name: 'assigned', displayName: 'הוקצה', color: '#3b82f6', order: 1 },
    { name: 'in_progress', displayName: 'בתהליך', color: '#8b5cf6', order: 2 },
    { name: 'waiting', displayName: 'בהמתנה', color: '#f59e0b', order: 3 },
    { name: 'completed', displayName: 'הושלם', color: '#10b981', order: 4 },
  ];
  for (const s of defaultStatuses) {
    await sql`INSERT INTO statuses (restaurant_id, name, display_name, color, order_index, is_default) VALUES (${restaurant1Id}, ${s.name}, ${s.displayName}, ${s.color}, ${s.order}, true)`;
    await sql`INSERT INTO statuses (restaurant_id, name, display_name, color, order_index, is_default) VALUES (${restaurant2Id}, ${s.name}, ${s.displayName}, ${s.color}, ${s.order}, true)`;
  }

  const adminRes = await sql`INSERT INTO users (email, name, password, role, status, restaurant_id) VALUES ('admin@restaurant.com', 'אלכס - Admin', ${bcrypt.hashSync('password123', 10)}, 'admin', 'approved', 1) RETURNING id`;
  const maintainerRes = await sql`INSERT INTO users (email, name, password, role, status, restaurant_id) VALUES ('manager@downtown.com', 'מריה - Maintainer', ${bcrypt.hashSync('password123', 10)}, 'maintainer', 'approved', 1) RETURNING id`;
  const workerRes = await sql`INSERT INTO users (email, name, password, role, status, restaurant_id) VALUES ('john@restaurant.com', 'יוחנן - Worker', ${bcrypt.hashSync('password123', 10)}, 'worker', 'approved', 1) RETURNING id`;
  const adminId = (adminRes.rows[0] as any).id;
  const maintainerId = (maintainerRes.rows[0] as any).id;
  const workerId = (workerRes.rows[0] as any).id;

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await sql`INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, due_date, recurrence, created_by) VALUES ('רשימת בדיקת פתיחה', 'בצע את כל הליכי הפתיחה', ${workerId}, 1, 'high', 'assigned', ${tomorrow}, 'daily', ${adminId})`;
  await sql`INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, due_date, recurrence, created_by) VALUES ('ניקוי תחנות המטבח', 'ניקוי עמוק של כל תחנות המטבח והציוד', ${workerId}, 1, 'high', 'in_progress', ${tomorrow}, 'daily', ${maintainerId})`;
  await sql`INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, due_date, recurrence, created_by) VALUES ('ספירת מלאי', 'ספור ורשום את כל פריטי המלאי', ${workerId}, 1, 'medium', 'planned', ${tomorrow}, 'weekly', ${maintainerId})`;
  await sql`INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, due_date, recurrence, created_by) VALUES ('רשימת בדיקת בריאות וביטחון', 'אמת שכל דרישות הבריאות והביטחון מתקיימות', ${workerId}, 1, 'critical', 'planned', ${tomorrow}, 'daily', ${adminId})`;

  const defaultTags = [
    { name: 'דחוף', color: '#ef4444' },
    { name: 'שגרה', color: '#3b82f6' },
    { name: 'תחזוקה', color: '#f59e0b' },
    { name: 'ניהול', color: '#8b5cf6' },
    { name: 'לקוחות', color: '#ec4899' },
    { name: 'בדיקה', color: '#10b981' }
  ];
  for (const tag of defaultTags) {
    await sql`INSERT INTO tags (restaurant_id, name, color, created_by) VALUES (${restaurant1Id}, ${tag.name}, ${tag.color}, ${adminId})`;
    await sql`INSERT INTO tags (restaurant_id, name, color, created_by) VALUES (${restaurant2Id}, ${tag.name}, ${tag.color}, ${adminId})`;
  }

  console.log('Database seeded. Admin: admin@restaurant.com / password123');
}
