/**
 * Idempotent migration: rename restaurants -> organizations, or create full schema when DB is empty.
 * Safe to run multiple times. Does NOT delete or drop any data.
 */
import { sql } from '../database';

let migrationPromise: Promise<void> | null = null;

/** Run when DB has no organizations and no restaurants (e.g. fresh Neon). Creates all tables. */
async function runInitialSchema(): Promise<void> {
  console.log('[migrate] Empty DB detected, creating schema...');
  await sql`CREATE TABLE IF NOT EXISTS organizations (id SERIAL PRIMARY KEY, name TEXT NOT NULL, location TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`;
  await sql`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT CHECK (role IN ('admin', 'maintainer', 'worker')) NOT NULL, status TEXT CHECK (status IN ('pending', 'approved')) DEFAULT 'approved', organization_id INTEGER REFERENCES organizations(id), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`;
  await sql`CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, title TEXT NOT NULL, description TEXT, assigned_to INTEGER REFERENCES users(id), organization_id INTEGER NOT NULL REFERENCES organizations(id), priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium', status TEXT CHECK (status IN ('planned', 'assigned', 'in_progress', 'waiting', 'completed', 'verified', 'overdue')) DEFAULT 'planned', due_date TIMESTAMPTZ, estimated_time INTEGER, recurrence TEXT CHECK (recurrence IN ('once', 'daily', 'weekly', 'monthly')), created_by INTEGER REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, completed_at TIMESTAMPTZ, verified_at TIMESTAMPTZ, verified_by INTEGER REFERENCES users(id), push_reminder_sent_at TIMESTAMPTZ)`;
  await sql`CREATE TABLE IF NOT EXISTS task_assignments (task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id), PRIMARY KEY (task_id, user_id))`;
  await sql`CREATE TABLE IF NOT EXISTS task_checklists (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, item TEXT NOT NULL, completed BOOLEAN DEFAULT FALSE, completed_at TIMESTAMPTZ)`;
  await sql`CREATE TABLE IF NOT EXISTS comments (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`;
  await sql`CREATE TABLE IF NOT EXISTS photos (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, uploaded_by INTEGER NOT NULL REFERENCES users(id), filename TEXT NOT NULL, filepath TEXT NOT NULL, uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`;
  await sql`CREATE TABLE IF NOT EXISTS statuses (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, display_name TEXT NOT NULL, color TEXT DEFAULT '#808080', order_index INTEGER DEFAULT 0, is_default BOOLEAN DEFAULT FALSE, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, UNIQUE(organization_id, name))`;
  await sql`CREATE TABLE IF NOT EXISTS tags (id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL REFERENCES organizations(id), name TEXT NOT NULL, color TEXT DEFAULT '#808080', color2 TEXT, created_by INTEGER NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, UNIQUE(organization_id, name))`;
  await sql`CREATE TABLE IF NOT EXISTS task_tags (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE, UNIQUE(task_id, tag_id))`;
  await sql`CREATE TABLE IF NOT EXISTS task_status_history (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, old_status TEXT, new_status TEXT NOT NULL, changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, changed_by INTEGER REFERENCES users(id))`;
  await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_task_assignments_user_id ON task_assignments(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id)`;
  console.log('[migrate] Initial schema created.');
}

/** Run when DB has "restaurants" table (legacy). Rename to organizations and columns. */
async function runRenameRestaurantToOrganization(): Promise<void> {
  console.log('[migrate] Old schema detected, running migration (restaurants -> organizations)...');
  try {
    await sql`ALTER TABLE restaurants RENAME TO organizations`;
  } catch (e: any) {
    if (e?.code === '42P01' || e?.message?.includes('does not exist')) return;
    throw e;
  }
  const userCol = await sql`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'restaurant_id' LIMIT 1`;
  if (userCol.rows.length > 0) await sql`ALTER TABLE users RENAME COLUMN restaurant_id TO organization_id`;
  const tasksCol = await sql`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'restaurant_id' LIMIT 1`;
  if (tasksCol.rows.length > 0) await sql`ALTER TABLE tasks RENAME COLUMN restaurant_id TO organization_id`;
  const statusesCol = await sql`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'statuses' AND column_name = 'restaurant_id' LIMIT 1`;
  if (statusesCol.rows.length > 0) await sql`ALTER TABLE statuses RENAME COLUMN restaurant_id TO organization_id`;
  const tagsCol = await sql`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'restaurant_id' LIMIT 1`;
  if (tagsCol.rows.length > 0) await sql`ALTER TABLE tags RENAME COLUMN restaurant_id TO organization_id`;
  await sql`DROP INDEX IF EXISTS idx_tasks_restaurant_id`;
  await sql`CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id)`;
  await sql`CREATE TABLE IF NOT EXISTS task_status_history (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, old_status TEXT, new_status TEXT NOT NULL, changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, changed_by INTEGER REFERENCES users(id))`;
  console.log('[migrate] Migration completed. Data preserved.');
}

export async function runMigrationIfNeeded(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    try {
      // Add push_reminder_sent_at to tasks if missing (for "due now" push notifications)
      const hasTasksTable = await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tasks'
        LIMIT 1
      `;
      if (hasTasksTable.rows.length > 0) {
        const hasCol = await sql`
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'push_reminder_sent_at'
          LIMIT 1
        `;
        if (hasCol.rows.length === 0) {
          await sql`ALTER TABLE tasks ADD COLUMN push_reminder_sent_at TIMESTAMPTZ`;
          console.log('[migrate] Added tasks.push_reminder_sent_at');
        }
      }

      const hasOrganizations = await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
        LIMIT 1
      `;
      if (hasOrganizations.rows.length > 0) {
        await sql`CREATE TABLE IF NOT EXISTS task_status_history (id SERIAL PRIMARY KEY, task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, old_status TEXT, new_status TEXT NOT NULL, changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, changed_by INTEGER REFERENCES users(id))`;
        return;
      }

      const hasRestaurants = await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurants'
        LIMIT 1
      `;
      if (hasRestaurants.rows.length > 0) {
        // Existing DB with old "restaurants" table -> rename migration
        await runRenameRestaurantToOrganization();
        return;
      }

      // Empty DB (e.g. fresh Neon) -> create full schema
      await runInitialSchema();
    } catch (err) {
      migrationPromise = null;
      console.error('[migrate] Error:', err);
      throw err;
    }
  })();
  return migrationPromise;
}
