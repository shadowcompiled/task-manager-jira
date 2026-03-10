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

## Push scheduled: must run every minute (Hobby plan)

The `push-scheduled` cron in `vercel.json` is set to `0 1 * * *` (once per day at 01:00 UTC). That is **not enough** for:

- **Daily reminders** at 9:00, 12:30, and 22:00 Israel time (those times are never hit with a single daily run).
- **“Due now”** pushes for tasks whose due date/time just passed (the handler checks the last 2 minutes).

For both to work, **call `/api/cron/push-scheduled` every minute** (e.g. with a free external cron). Vercel Hobby allows only one cron run per day per job, so use an external service.

### How it works

- **Due-now pushes:** The handler checks for tasks whose `due_date` is in the last 2 minutes and sends “משימה בשל” to assignees. Requires a run every minute.
- **Daily reminders (Israel time):** 9:00–9:04 (“בוקר טוב”), 12:30–12:34 (“משמרת מוצלחת”), 22:00–22:04 (“לילה טוב”). Sent at most once per day per slot (state is stored in the `scheduled_push_log` table).

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

Your backend will then be triggered every minute, send “due now” pushes when a task’s due time has just passed, and send the daily reminders at 9:00, 12:30, and 22:00 Israel time (once per day each).

### Testing scheduled reminders

To verify daily reminders without waiting for the clock:

1. **Manual trigger:** Call `GET https://YOUR_VERCEL_DOMAIN/api/cron/push-scheduled` with header `Authorization: Bearer YOUR_CRON_SECRET` when Israel time is 9:00–9:04, 12:30–12:34, or 22:00–22:04. Subscribed users should receive the corresponding push; the same slot will not be sent again that day (see “Admin test” below to force a run).
2. **Admin test endpoint:** As an admin, call `POST /api/push/test-scheduled` with your auth token. This runs the scheduled-notifications logic once (current Israel time). Useful to confirm DB persistence: calling it twice in the same Israel day for the same slot does not send duplicates.
