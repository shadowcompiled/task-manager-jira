# Deployment – Single Vercel Project (no Railway)

Everything runs on **one Vercel project**: frontend (static) and backend (serverless API) in the same repo and the same deployment. Do not use Railway or any other backend host.

## Architecture

- **Repo root** is the project root for Vercel. Deploy from the repository root (not from `frontend/` or `backend/`).
- **Build:** `vercel.json` runs `installCommand` and `buildCommand` to install and build both backend and frontend. Output is `frontend/dist` (static assets).
- **API:** All `/api/*` requests are rewritten to the serverless function at `api/index.js`, which loads the Express app from `backend/dist/server.js`. The backend runs only as serverless (no long-running process).
- **Crons:** Scheduled jobs (expiring-task notifications, push reminders, cleanup) run via **Vercel Cron** by calling the HTTP endpoints defined in root `vercel.json`. No in-process scheduler.

## One-time setup

1. **Connect the repo** to Vercel (Import Git Repository). Use the **root** of the repository as the project root.
2. **Database:** Use **Vercel Postgres** (Storage tab → Create Database). This sets `POSTGRES_URL` (and related) automatically. For a new database, run the schema once (Vercel Postgres SQL tab or locally: `psql $POSTGRES_URL -f backend/src/db/schema.sql`).
3. **Environment variables:** In Vercel → Project Settings → Environment Variables, set the variables below (Production and Preview as needed).

## Environment variables

Set these in the Vercel project (**Settings → Environment Variables**):

| Variable | Required | Notes |
|----------|----------|--------|
| `POSTGRES_URL` | Yes | Usually set by **Vercel Postgres** integration. Otherwise paste the connection string. |
| `JWT_SECRET` | Yes | Strong secret for auth tokens (e.g. `openssl rand -hex 32`). |
| `CRON_SECRET` | Yes | Secret for protecting cron endpoints. Vercel Cron must send it (see Crons below). |
| `VAPID_PUBLIC_KEY` | Yes (for push) | Web Push VAPID public key. |
| `VAPID_PRIVATE_KEY` | Yes (for push) | Web Push VAPID private key. |
| `EMAIL_FROM` | Optional | e.g. `mailto:you@example.com` (used for push/VAPID subject). |
| `EMAIL_USER` / `EMAIL_PASSWORD` | Optional | For SMTP email (task assignment/expiry). App works without email. |
| `SENDGRID_API_KEY` | Optional | Alternative to SMTP for sending email. |

Do **not** set `VITE_API_URL` in Vercel. The frontend uses `/api` (same origin) in production. If you previously had `VITE_API_URL` pointing at Railway (or another host), **remove it** from Vercel Environment Variables and redeploy.

## Crons

Root `vercel.json` defines two cron jobs:

- **`/api/cron/daily-notifications`** – hourly (`0 * * * *`): expiring-task emails, recurring task processing, cleanup of old completed tasks.
- **`/api/cron/push-scheduled`** – every minute (`* * * * *`): scheduled push notifications (e.g. morning/noon/evening).

The cron routes in `backend/src/routes/cron.ts` require authentication: `Authorization: Bearer <CRON_SECRET>` or header `x-cron-secret: <CRON_SECRET>`. Set `CRON_SECRET` in Vercel and, if your plan supports it, configure the Vercel Cron to send this header or use Vercel’s cron secret feature so that only Vercel’s runner can call these endpoints.

## Database and migrations

- **Vercel Postgres:** With the integration, `POSTGRES_URL` is injected automatically.
- **Schema:** Backend runs `runMigrationIfNeeded()` on each request when on Vercel. For a brand-new database, run `backend/src/db/schema.sql` once (e.g. via Vercel Postgres SQL tab or `psql $POSTGRES_URL -f backend/src/db/schema.sql`).

## Summary

- **Single Git repo, single Vercel project, one deployment.**
- Frontend: static from `frontend/dist`. API: serverless via `api/index.js` → Express in `backend/`.
- All required env vars and cron auth are configured in the Vercel project.
