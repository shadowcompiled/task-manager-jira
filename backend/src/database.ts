/**
 * Vercel Postgres - serverless-compatible DB layer.
 * Use POSTGRES_URL in env (from Vercel Postgres storage).
 * Run schema once: see src/db/schema.sql
 */
import { sql } from '@vercel/postgres';

export { sql };

export async function initializeDatabase(): Promise<void> {
  // Schema is applied via Vercel Dashboard or: psql $POSTGRES_URL -f src/db/schema.sql
  // Optionally run idempotent schema here if needed (e.g. in seed script).
  console.log('✅ Using Vercel Postgres (schema must be applied separately)');
}
