# 🚀 Vercel Deployment Guide

## Overview

This app uses:
- **Frontend**: React + Vite → Deploy on **Vercel**
- **Backend**: Node.js + Express + SQLite → Deploy on **Railway** or **Render**

> ⚠️ Vercel serverless doesn't support SQLite (ephemeral filesystem). Backend must be deployed separately.

---

## Step 1: Deploy Backend (Railway - Recommended)

### Option A: Railway (Easiest)

1. **Go to** [railway.app](https://railway.app) and sign up

2. **Create new project** → "Deploy from GitHub"

3. **Connect your repo** and select the `backend` folder

4. **Add environment variables**:
   ```
   PORT=3000
   NODE_ENV=production
   JWT_SECRET=your-super-secret-key-change-this
   DATABASE_PATH=./restaurant.db
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_FROM=your-email@gmail.com
   ```

5. **Set start command**: `npm run build && npm start`

6. **Get your URL**: `https://your-app.railway.app`

### Option B: Render

1. **Go to** [render.com](https://render.com) and sign up

2. **New** → **Web Service** → Connect GitHub

3. **Settings**:
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

4. **Add environment variables** (same as Railway)

5. **Get your URL**: `https://your-app.onrender.com`

---

## Step 2: Deploy Frontend (Vercel)

### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: mission-tracking
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist
```

### Option B: Vercel Dashboard

1. **Go to** [vercel.com](https://vercel.com) and sign up

2. **Import Project** → Connect GitHub

3. **Configure**:
   - Root Directory: `frontend`
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variable**:
   ```
   VITE_API_URL=https://your-backend-url.railway.app/api
   ```

5. **Deploy**

---

## Step 3: Configure CORS

Update `backend/src/server.ts` to allow your Vercel domain:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-app.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

---

## Step 4: Custom Domain (Optional)

### Vercel (Frontend)
1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records as instructed

### Railway (Backend)
1. Go to Project Settings → Custom Domain
2. Add your API subdomain (e.g., `api.yourdomain.com`)
3. Update DNS records

---

## Environment Variables Summary

### Backend (.env)
```env
# Server
PORT=3000
NODE_ENV=production
JWT_SECRET=generate-a-32-char-random-string

# Database
DATABASE_PATH=./restaurant.db

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

### Frontend (Vercel Environment Variables)
```env
VITE_API_URL=https://your-backend.railway.app/api
```

---

## Quick Deploy Commands

```bash
# Frontend (Vercel)
cd frontend
vercel --prod

# Backend (Railway - using CLI)
npm install -g @railway/cli
cd backend
railway login
railway init
railway up
```

---

## Post-Deployment Checklist

- [ ] Backend API is accessible (test: `https://your-backend/api/health`)
- [ ] Frontend loads correctly
- [ ] Login works (admin@restaurant.com / admin123)
- [ ] Can create new users
- [ ] Email notifications working
- [ ] CORS configured correctly
- [ ] HTTPS enabled
- [ ] Custom domain configured (optional)

---

## Default Admin Credentials

```
Email: admin@restaurant.com
Password: admin123
```

**⚠️ Change this password immediately after first login!**

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Add frontend URL to backend CORS config |
| API not reachable | Check VITE_API_URL in Vercel env vars |
| Login fails | Verify JWT_SECRET is set in backend |
| Emails not sending | Check EMAIL_* variables and app password |
| Database reset | Railway/Render persist SQLite file |

---

## Architecture Diagram

```
┌─────────────────┐         ┌─────────────────┐
│   Vercel        │         │   Railway       │
│   (Frontend)    │  HTTPS  │   (Backend)     │
│                 │◄───────►│                 │
│   React + Vite  │         │   Express API   │
│                 │         │   + SQLite      │
└─────────────────┘         └─────────────────┘
        │                           │
        │                           │
        ▼                           ▼
   ┌─────────┐               ┌─────────────┐
   │ Users   │               │ Gmail SMTP  │
   │ Browser │               │ (Emails)    │
   └─────────┘               └─────────────┘
```

---

## Cost Estimate

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Vercel | 100GB bandwidth/month | Hobby plan free |
| Railway | $5 credit/month | Enough for small apps |
| Render | 750 hours/month | Free web service |
| Gmail SMTP | Free | 500 emails/day limit |

---

**Your app is ready for production! 🚀**
