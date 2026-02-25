/**
 * Vercel Postgres - serverless-compatible DB layer.
 * Use POSTGRES_URL in env (from Vercel Postgres storage).
 * Run schema once: see src/db/schema.sql
 */
import { sql } from '@vercel/postgres';
import { runMigrationIfNeeded } from './db/migrate';

export { sql };

export async function initializeDatabase(): Promise<void> {
  await runMigrationIfNeeded();
  console.log('✅ Database ready');
}
