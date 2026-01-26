# 🚀 Quick Start Guide - Restaurant Task Manager

Get your app running in 5 minutes (locally) or deploy to Vercel in under 10 minutes!

---

## 📦 Option 1: Run Locally (5 minutes)

### 1.1 Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### 1.2 Start Backend Server

```bash
cd backend
npm start
```

Expected output:
```
✓ Database initialized
✓ Server running on http://localhost:3000
✓ API ready at http://localhost:3000/api
```

### 1.3 Start Frontend (in new terminal)

```bash
cd frontend
npm run dev
```

Expected output:
```
✓ Frontend running on http://localhost:5173
```

### 1.4 Open in Browser

Visit: `http://localhost:5173`

---

## 🔐 Demo Login Credentials

After startup, the database auto-seeds with 4 demo users:

### Admin Account
- **Email**: admin@test.com
- **Password**: password123
- **Role**: Admin (full access)

### Manager Account
- **Email**: manager@test.com
- **Password**: password123
- **Role**: Manager (create/manage tasks)

### Staff Accounts (2)
- **Email**: staff1@test.com or staff2@test.com
- **Password**: password123
- **Role**: Staff (view/complete tasks)

---

## 🌐 Option 2: Deploy to Vercel (10 minutes)

### Prerequisites
- GitHub account
- Vercel account (free)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Restaurant Task Manager"
git remote add origin https://github.com/YOUR_USERNAME/mission-tracking-jira.git
git push -u origin main
```

### Step 2: Deploy with Vercel

#### Option A: CLI (Recommended)
```bash
npm i -g vercel
vercel
# Follow prompts
```

#### Option B: Dashboard
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import GitHub repository
3. Set root directory: `./`
4. Add environment variables (see table below)
5. Deploy!

### Step 3: Set Environment Variables in Vercel

| Variable | Value | Example |
|----------|-------|---------|
| `JWT_SECRET` | Generate random 32 chars | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NODE_ENV` | `production` | - |
| `DATABASE_PATH` | `/tmp/restaurant.db` | - |
| `PORT` | `3000` | - |

### Step 4: Access Your App

```
Frontend: https://your-project.vercel.app
API:      https://your-project.vercel.app/api
```

Test: Visit `https://your-project.vercel.app` and login with demo credentials!

---

## 📋 Available Scripts

### Backend
```bash
npm start           # Run server
npm run build       # Build TypeScript
npm run seed        # Load demo data
npm run dev         # Dev with auto-reload (requires nodemon)
```

### Frontend
```bash
npm run dev         # Dev server with hot reload
npm run build       # Build for production
npm run preview     # Preview production build locally
npm run lint        # Check for linting issues
```

---

## 🎯 First Task: Create a Task

1. Login with manager credentials
2. Click "New Task" button
3. Fill in details:
   - **Title**: "Check inventory"
   - **Priority**: High
   - **Due Date**: Tomorrow
   - **Assign To**: Staff member
4. Click "Create"
5. View in Daily List or Kanban board

---

## 📱 Features to Try

### Daily List View
- Filter by Today, Urgent, Overdue, or All
- Quick overview of pending tasks
- Click to expand task details

### Kanban Board
- Drag tasks between columns
- Visual workflow status
- Supports: Planned → Assigned → In Progress → Waiting → Completed → Verified

### Dashboard Analytics
- Overview stats (total, urgent, overdue)
- Staff performance metrics
- Task completion rates
- Overdue task tracking

### Task Management
- Create, edit, delete tasks
- Add comments and photos
- Mark complete and verify
- Set recurrence (daily, weekly, monthly)

---

## 🔧 Customization

### Add Your Restaurant Name

Edit `backend/src/seed.ts`:
```typescript
// Line ~15
name: "YOUR RESTAURANT NAME",  // Change this
```

Then reseed:
```bash
npm run seed
```

### Change API Port

Edit `backend/.env.development`:
```env
PORT=3001  # Changed from 3000
```

### Update Styling

Frontend uses Tailwind CSS:
- Colors: `frontend/tailwind.config.js`
- Fonts: `frontend/src/index.css`
- Components: Easy to customize (React files in `src/components`)

---

## 🚨 Troubleshooting

### npm install fails
```bash
# Try clearing cache
npm cache clean --force
npm install
```

### Backend won't start
```bash
# Check if port 3000 is in use
# macOS/Linux:
lsof -i :3000

# Windows:
netstat -ano | findstr :3000

# Kill process if needed (Windows):
taskkill /PID <PID> /F
```

### Frontend can't connect to API
- Make sure backend is running (`npm start` in backend folder)
- Check `VITE_API_URL` in frontend/.env.development
- Default: `http://localhost:3000/api`

### Database errors
```bash
# Reset database and reseed
rm backend/restaurant.db  # or /tmp/restaurant.db
npm run seed
```

### Login fails
- Use exact credentials from above
- Case-sensitive email
- Password: `password123` (no quotes)

---

## 📚 Documentation

For detailed information:
- **API Reference**: See [API_REFERENCE.md](./docs/API_REFERENCE.md)
- **Features**: See [FEATURES.md](./docs/FEATURES.md)
- **Vercel Deployment**: See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **Architecture**: See [PROJECT_SUMMARY.md](./docs/PROJECT_SUMMARY.md)

---

## ✅ Production Checklist

Before going live:

- [ ] Change JWT_SECRET to unique value
- [ ] Update database (migrate to PostgreSQL for large scale)
- [ ] Test on real domain
- [ ] Set custom domain in Vercel
- [ ] Enable SSL/HTTPS (automatic)
- [ ] Monitor error logs
- [ ] Regular backups

---

## 🎓 Next Steps

1. **Understand the Code**
   - Backend: `backend/src/server.ts`
   - Frontend: `frontend/src/App.tsx`
   - API: `backend/src/routes/`

2. **Add Features**
   - Custom task categories
   - Photo uploads
   - Notifications
   - Team messaging

3. **Scale Up**
   - Migrate to PostgreSQL
   - Add Redis caching
   - Upgrade Vercel plan

4. **Monitor & Optimize**
   - Check Vercel analytics
   - Review error logs
   - Optimize slow endpoints

---

## 💡 Tips & Tricks

### Speed Up Development
```bash
# Use nodemon for auto-restart on file changes
npm install -D nodemon
# Then: nodemon dist/server.js
```

### Add TypeScript Checking
```bash
npm run build  # Validates TypeScript syntax
```

### Mobile Testing
```bash
# Get your local IP address and access from phone
# macOS: ipconfig getifaddr en0
# Windows: ipconfig (look for IPv4 Address)
# Then visit: http://YOUR_IP:5173
```

---

## 🤝 Need Help?

- Check logs: Open browser DevTools (F12)
- Backend logs: Check terminal where `npm start` runs
- Vercel logs: Dashboard → Function logs
- API test: Use Postman or curl

---

## 📞 Support

For issues:
1. Check [TROUBLESHOOTING](./docs/TROUBLESHOOTING.md)
2. Review [API_REFERENCE](./docs/API_REFERENCE.md)
3. Check error logs in terminal/dashboard

---

**You're all set! 🎉 Happy task managing!**

Next: Try creating your first task or deploy to Vercel!
