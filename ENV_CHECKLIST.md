# Vercel env – what to set (single deployment)

In **Vercel → Your project → Settings → Environment Variables**:

## Required

| Variable | What to do |
|----------|------------|
| `POSTGRES_URL` | Create **Vercel Postgres** (Storage → Create Database); this is set for you. Or paste your Postgres connection string. |
| `JWT_SECRET` | Add a long random string (e.g. run `openssl rand -hex 32` and paste it). |
| `CRON_SECRET` | Add a random string (cron jobs use it to call your API). |
| `VAPID_PUBLIC_KEY` | Add your Web Push public key (for push notifications). |
| `VAPID_PRIVATE_KEY` | Add your Web Push private key. |

## Optional

| Variable | What to do |
|----------|------------|
| `EMAIL_FROM` | e.g. `mailto:you@example.com` – only if you use email. |
| `EMAIL_USER` / `EMAIL_PASSWORD` | SMTP for email – only if you use email. |
| `SENDGRID_API_KEY` | Alternative to SMTP – only if you use SendGrid. |

## Remove (if present)

| Variable | What to do |
|----------|------------|
| `VITE_API_URL` | **Delete it.** The app uses `/api` on the same domain. If it was set to a Railway URL, removing it fixes login. |
| `CORS_ORIGIN` | Not needed for single Vercel deployment. You can delete it. |

Then **redeploy** (Deployments → ⋮ on latest → Redeploy, or push a new commit).
