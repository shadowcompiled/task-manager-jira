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
