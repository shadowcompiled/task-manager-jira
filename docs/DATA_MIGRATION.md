# Copy data from Railway to Neon (or any PostgreSQL)

Use this to move all app data from your old Railway PostgreSQL database to your current Neon database.

## Option 1: Run the migration script (recommended)

The script copies all tables from Railway to Neon and handles renames (`restaurants` → `organizations`, `restaurant_id` → `organization_id`) if your Railway DB used the old schema.

### 1. Get connection strings

- **Railway:** Railway dashboard → your PostgreSQL service → **Variables** or **Connect** → copy the URL (e.g. `postgresql://user:pass@host.railway.app:5432/railway`).
- **Neon:** Neon dashboard (or Vercel env) → copy the connection string (e.g. `postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require`).

### 2. Ensure Neon has the schema

Your Neon DB should already have tables (the app creates them on first request). If Neon is completely empty, trigger the app once so the migration runs and creates the schema, or run `backend/src/db/schema.sql` against Neon first.

### 3. Run the script

From the **project root** (not inside `backend`):

```bash
cd backend
npm install
SOURCE_DATABASE_URL="postgresql://..." TARGET_DATABASE_URL="postgresql://..." node scripts/migrate-railway-to-neon.js
```

Replace the URLs with your real Railway and Neon connection strings. Use quotes so special characters in the password don’t break the command.

- The script copies data in the right order (organizations → users → tasks → etc.).
- If Railway has a `restaurants` table, it is copied into Neon’s `organizations` table.
- Sequences are reset so new rows get correct IDs.

---

## Option 2: Manual export/import with pg_dump

If you prefer not to use the script or don’t have Node handy:

### 1. Export data from Railway (data only)

On a machine with `pg_dump` (e.g. WSL, Mac, or [PostgreSQL tools](https://www.postgresql.org/download/windows/)):

```bash
pg_dump "$RAILWAY_DATABASE_URL" --data-only --column-inserts -f railway_data.sql
```

If your Railway DB uses the **old** table name `restaurants`, edit `railway_data.sql` and replace:

- `restaurants` → `organizations`
- `restaurant_id` → `organization_id`

(Do the same for any column or table name that differs from the current schema.)

### 2. Import into Neon

Make sure Neon already has the schema (app migration or running `backend/src/db/schema.sql`). Then:

```bash
psql "$NEON_DATABASE_URL" -f railway_data.sql
```

### 3. Reset sequences (so new IDs don’t conflict)

Run in Neon (e.g. in Neon SQL Editor or `psql`):

```sql
SELECT setval(pg_get_serial_sequence('organizations', 'id'), COALESCE((SELECT MAX(id) FROM organizations), 1));
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval(pg_get_serial_sequence('tasks', 'id'), COALESCE((SELECT MAX(id) FROM tasks), 1));
-- Repeat for other tables with SERIAL id: statuses, tags, task_assignments, task_checklists, comments, photos, task_tags, task_status_history, push_subscriptions
```

---

## After migration

1. Set your Vercel (or app) env to use the **Neon** connection string only.
2. Open the app and log in with an existing user; all data should be there.
