# Vercel deployment – fix 405 on POST /api/auth/login

## Root Directory must be the repository root

In **Vercel → Project Settings → General → Root Directory**:

- Leave **Root Directory** empty (or set to `.`) so the **repository root** is used.
- Do **not** set it to `frontend`.

If Root Directory is set to `frontend`:

- Only `frontend/vercel.json` is used. It rewrites **all** requests (including `/api/*`) to `index.html`.
- The `api/` folder and root `vercel.json` are not used, so there are no serverless functions.
- **POST** `/api/auth/login` is then handled as POST to a static page → **405 Method Not Allowed**.

With Root Directory at the repo root:

- Root `vercel.json` is used (API rewrites + build commands).
- The `api/` serverless function is deployed and `/api/*` is handled by the backend.

## Build / output (already in vercel.json)

- **Install:** `cd backend && npm ci && cd ../frontend && npm ci`
- **Build:** `cd backend && npm run build && cd ../frontend && npm run build`
- **Output:** `frontend/dist`

No need to override these in the dashboard if `vercel.json` is in effect (repo root).

---

## Notifications at the exact minute (Hobby plan)

Vercel Hobby allows only **one cron run per day**. To send push notifications **at the same minute** a task’s due date is set (e.g. “remind me at 15:00”), use a **free external cron** that calls your API every minute.

### How it works

- When a task has a **due date/time**, the app sends a push to assignees when that time is reached.
- The backend endpoint `/api/cron/push-scheduled` checks for tasks due in the last 2 minutes and sends “משימה בשל” (task due now) pushes. It must be **called every minute** for that to work.
- On Hobby, Vercel cron runs that endpoint only once per day, so use an external service to call it every minute.

### Setup with cron-job.org (free)

1. Go to [cron-job.org](https://cron-job.org) and create a free account.
2. Create a new cron job:
   - **URL:** `https://YOUR_VERCEL_DOMAIN/api/cron/push-scheduled`
   - **Schedule:** every minute (e.g. `* * * * *` or the “Every minute” option).
   - **Request method:** GET.
   - **Request headers:** add:
     - **Name:** `Authorization`  
     - **Value:** `Bearer YOUR_CRON_SECRET`
   - Use the same value as the `CRON_SECRET` env var in Vercel.
3. Save and enable the job.

Your backend will then be triggered every minute, send “due now” pushes for tasks whose due date/time just passed, and still run the fixed-time notifications (9:00, 12:30, 22:00 Israel time) when the minute falls on those times.
