/**
 * Idempotent migration: rename restaurants -> organizations, restaurant_id -> organization_id.
 * Safe to run multiple times. Does NOT delete or drop any data.
 * Runs automatically on first request (or server start) when old schema is detected.
 */
import { sql } from '../database';

let migrationPromise: Promise<void> | null = null;

export async function runMigrationIfNeeded(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    try {
      // Add push_reminder_sent_at to tasks if missing (for "due now" push notifications)
      const hasCol = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'push_reminder_sent_at'
        LIMIT 1
      `;
      if (hasCol.rows.length === 0) {
        await sql`ALTER TABLE tasks ADD COLUMN push_reminder_sent_at TIMESTAMPTZ`;
        console.log('[migrate] Added tasks.push_reminder_sent_at');
      }

      let hasNew = await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
        LIMIT 1
      `;
      if (hasNew.rows.length > 0) return;

      const hasOld = await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'restaurants'
        LIMIT 1
      `;
      if (hasOld.rows.length === 0) return;

      console.log('[migrate] Old schema detected, running migration (restaurants -> organizations)...');

      hasNew = await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
        LIMIT 1
      `;
      if (hasNew.rows.length > 0) return;

      try {
        await sql`ALTER TABLE restaurants RENAME TO organizations`;
      } catch (e: any) {
        if (e?.code === '42P01' || e?.message?.includes('does not exist')) {
          return;
        }
        throw e;
      }

      const userCol = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'restaurant_id'
        LIMIT 1
      `;
      if (userCol.rows.length > 0) await sql`ALTER TABLE users RENAME COLUMN restaurant_id TO organization_id`;

      const tasksCol = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'restaurant_id'
        LIMIT 1
      `;
      if (tasksCol.rows.length > 0) await sql`ALTER TABLE tasks RENAME COLUMN restaurant_id TO organization_id`;

      const statusesCol = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'statuses' AND column_name = 'restaurant_id'
        LIMIT 1
      `;
      if (statusesCol.rows.length > 0) await sql`ALTER TABLE statuses RENAME COLUMN restaurant_id TO organization_id`;

      const tagsCol = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'tags' AND column_name = 'restaurant_id'
        LIMIT 1
      `;
      if (tagsCol.rows.length > 0) await sql`ALTER TABLE tags RENAME COLUMN restaurant_id TO organization_id`;

      await sql`DROP INDEX IF EXISTS idx_tasks_restaurant_id`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id)`;

      console.log('[migrate] Migration completed. Data preserved.');
    } catch (err) {
      migrationPromise = null;
      console.error('[migrate] Error:', err);
      throw err;
    }
  })();
  return migrationPromise;
}
