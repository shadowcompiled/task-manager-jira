# 🚀 Vercel Deployment Guide

## Deploy to Vercel in 5 Minutes

This guide will help you deploy the Restaurant Task Manager to Vercel.

---

## Prerequisites

1. **GitHub Account** - Push your code to GitHub
2. **Vercel Account** - Create free account at [vercel.com](https://vercel.com)
3. **Environment Variables** - Have your secrets ready

---

## Step 1: Push Code to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Restaurant Task Manager"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/mission-tracking-jira.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Easiest)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to GitHub (or create new project)
# - Select root directory: ./
# - Confirm build settings
```

### Option B: Using Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import from GitHub
3. Select your repository
4. Configure:
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
5. Add environment variables (see below)
6. Click "Deploy"

---

## Step 3: Configure Environment Variables

### In Vercel Dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add these variables:

```env
JWT_SECRET=generate-a-random-secret-key-here
NODE_ENV=production
DATABASE_PATH=/tmp/restaurant.db
PORT=3000
```

**To generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### .env.local (for local testing)
```env
VITE_API_URL=http://localhost:3000/api
```

---

## Step 4: Database Setup for Vercel

### Option A: SQLite (Recommended for Small Projects)

Database automatically created at `/tmp/restaurant.db` (ephemeral, resets on redeploy)

### Option B: PostgreSQL (Recommended for Production)

1. Create PostgreSQL database (e.g., on Railway, Supabase, or AWS RDS)
2. Update `backend/src/database.ts` to use PostgreSQL
3. Add `DATABASE_URL` to Vercel environment variables

**Quick PostgreSQL Setup:**

Use [Railway.app](https://railway.app) (free tier available):
1. Create PostgreSQL plugin
2. Copy connection string
3. Add to Vercel env as `DATABASE_URL`

---

## Step 5: Seed Sample Data (Optional)

After deployment, seed sample data:

```bash
# Login to Vercel
vercel env pull

# Run seed locally
npm run seed

# Or seed via API call (use your deployed URL)
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "name": "Admin",
    "password": "password123",
    "role": "admin"
  }'
```

---

## Deployment URLs

After deployment, you'll have:

```
Frontend: https://your-project.vercel.app
API:      https://your-project.vercel.app/api
```

Test the API:
```bash
curl https://your-project.vercel.app/api/health
```

---

## Frontend Configuration

### Update API Endpoint

Edit `frontend/src/store.ts`:

```typescript
const API_BASE = process.env.VITE_API_URL || '/api';
```

This uses the same domain (no CORS issues!)

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and redeploy
vercel --prod --force
```

### Database Connection Error
- Check environment variables are set
- Verify DATABASE_URL is correct
- For PostgreSQL, ensure connection limit is high enough

### CORS Errors
- Vercel config already handles this
- If still issues, check `vercel.json` routes

### Frontend Blank
- Check browser console for errors
- Verify API_BASE is correct
- Ensure backend is responding

### Slow Performance
- Upgrade Vercel plan (Pro supports more concurrency)
- Enable PostgreSQL instead of SQLite
- Add Redis caching

---

## Production Checklist

- [ ] Push code to GitHub
- [ ] Create Vercel account
- [ ] Import GitHub repo
- [ ] Set environment variables
- [ ] Change JWT_SECRET to unique value
- [ ] Test API endpoint (/api/health)
- [ ] Test login page
- [ ] Create test task
- [ ] Monitor Vercel logs for errors

---

## Custom Domain

1. Go to **Project Settings** → **Domains**
2. Add your domain
3. Update DNS records (Vercel provides instructions)
4. SSL certificate auto-provisioned

---

## Scaling for Production

As your user base grows:

1. **Database**: Migrate to PostgreSQL (Railway, Supabase, PlanetScale)
2. **Caching**: Add Redis layer
3. **Plan**: Upgrade to Vercel Pro ($20/month)
4. **Monitoring**: Add error tracking (Sentry, LogRocket)
5. **Analytics**: Track usage and performance

---

## Redeploy After Changes

After updating code:

```bash
# Push to GitHub
git add .
git commit -m "Update feature"
git push

# Vercel auto-deploys! Or manually:
vercel --prod
```

---

## Cost Estimate

### Vercel (Free Tier)
- ✅ Unlimited deployments
- ✅ Serverless functions
- ✅ Includes all features
- Upgrade to Pro if hitting limits ($20/month)

### Database
- **SQLite**: Free (ephemeral)
- **PostgreSQL**: ~$5-20/month (Railway, Supabase)

### Total: Free - $25/month

---

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `JWT_SECRET` | Encrypt auth tokens | (random 32 chars) |
| `NODE_ENV` | Environment type | `production` |
| `DATABASE_PATH` | DB location | `/tmp/restaurant.db` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL URI | `postgresql://...` |

---

## Sample Data in Production

### Create Admin User
```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@restaurant.com",
    "name": "Admin User",
    "password": "SecurePassword123!",
    "role": "admin"
  }'
```

### Create Manager User
```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@restaurant.com",
    "name": "Manager",
    "password": "SecurePassword123!",
    "role": "manager"
  }'
```

---

## Performance Tips

1. **Use PostgreSQL** for better performance
2. **Enable caching** in Vercel settings
3. **Minimize bundle size** (already done with Vite)
4. **Monitor logs** for slow requests
5. **Use CDN** for static assets

---

## Security Best Practices

- ✅ Change JWT_SECRET to unique value
- ✅ Use strong passwords
- ✅ Enable HTTPS (automatic)
- ✅ Keep dependencies updated
- ✅ Monitor error logs
- ✅ Regular backups (for PostgreSQL)

---

## Monitoring

### Vercel Analytics
1. Dashboard shows requests, performance
2. Real-time logs for debugging
3. Error tracking built-in

### Server Logs
```bash
# View live logs
vercel logs

# Filter by path
vercel logs --since 1h
```

---

## Rollback Previous Deploy

If something breaks:

```bash
# View deployments
vercel list

# Rollback to previous
vercel rollback
```

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **API Issues**: Check backend logs in Vercel dashboard
- **Database Issues**: Check PostgreSQL provider logs
- **CORS Issues**: Review `vercel.json` routes

---

**Your app is now live! 🚀**

Visit: `https://your-project.vercel.app`

---

Next: Monitor your deployment and make updates as needed!
