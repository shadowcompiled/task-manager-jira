# AGENTS.md

## Cursor Cloud specific instructions

### Architecture

Restaurant Mission Tracking System — a Hebrew (RTL) mobile-first task management app for restaurants. Two independent packages (no root `package.json`):

| Directory | Purpose | Dev command |
|-----------|---------|-------------|
| `backend/` | Express REST API (TypeScript, port 3000) | `NODE_OPTIONS="--require ./neon-local-shim.js" npm run dev` |
| `frontend/` | React SPA (Vite, port 5173) | `npm run dev` |

### Database

The backend uses `@vercel/postgres` (Neon serverless driver) which communicates over HTTP, **not** standard PostgreSQL protocol. A local shim (`backend/neon-local-shim.js`) intercepts `neonConfig.fetchFunction` and routes queries to local PostgreSQL via the `pg` library.

**PostgreSQL must be running before starting the backend:**
```
sudo pg_ctlcluster 16 main start
```

Connection string: `postgresql://ubuntu:devpassword@localhost:5432/mission_tracking`

To apply schema: `psql -d mission_tracking -f backend/src/db/schema.sql`
To seed: `cd backend && POSTGRES_URL="postgresql://ubuntu:devpassword@localhost:5432/mission_tracking" NODE_OPTIONS="--require ./neon-local-shim.js" npx ts-node -e "require('./src/seed').seedDatabase().then(() => process.exit(0))"`

### Starting services

1. Start PostgreSQL: `sudo pg_ctlcluster 16 main start`
2. Start backend: `cd backend && NODE_OPTIONS="--require ./neon-local-shim.js" npm run dev`
3. Start frontend: `cd frontend && npm run dev`

The frontend reads `VITE_API_URL` from `frontend/.env.development` (defaults to `http://localhost:3000/api`) and makes direct API calls to the backend (the Vite proxy in `vite.config.ts` targets port 5000, which is a mismatch; rely on `VITE_API_URL` instead).

### Backend .env

Required at `backend/.env`:
```
POSTGRES_URL=postgresql://ubuntu:devpassword@localhost:5432/mission_tracking
JWT_SECRET=dev-secret-key-for-local-testing
CRON_SECRET=dev-cron-secret
```

### Lint & Build

- **Frontend lint:** `cd frontend && npm run lint` (ESLint 8, config at `.eslintrc.cjs`). Pre-existing warnings/errors exist in the codebase.
- **Frontend build:** `cd frontend && npm run build` (runs `tsc && vite build`)
- **Backend build:** `cd backend && npm run build` (runs `tsc`)
- **No test suite exists** in this repository.

### Default credentials

After seeding: `admin@restaurant.com` / `password123`

### Known issues

- The "New Task" UI form sends a `station` field that doesn't exist in the database schema, causing task creation via the UI to fail with HTTP 500. Tasks can be created via direct API calls or database inserts.
