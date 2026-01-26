# ⚡ Quick Start Guide

## 🚀 Start Both Servers (2 Terminal Windows)

### Terminal 1: Backend
```bash
cd backend
npm install
npm run dev
```
✅ API running at `http://localhost:5000`

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev
```
✅ App running at `http://localhost:5173`

## 🔑 Login Credentials (After Seeding)

### To seed sample data:
```bash
cd backend
npm run seed
```

### Demo Users:
- **Manager**: manager@downtown.com / password123
- **Staff**: john@downtown.com / password123

## 📋 Database

- Automatically initialized on first run
- Sample data seeded with `npm run seed`
- SQLite database stored as `backend/restaurant.db`
- Reset by deleting the .db file and restarting

## 🎯 Key Features to Try

### Staff View
1. Login as john@downtown.com
2. See your assigned tasks
3. Click a task → "Mark as Complete"
4. Manager will verify it

### Manager View
1. Login as manager@downtown.com
2. Click "Create Task" to assign work
3. Go to Kanban Board to see task flow
4. Check Dashboard for performance stats
5. Verify completed tasks

### Admin View
1. Login as admin@restaurant.com
2. Access all dashboard analytics
3. Monitor restaurant-wide performance

## 🔧 Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-this
DATABASE_PATH=./restaurant.db
```

## 📱 Mobile Experience

App is fully mobile-responsive:
- Open on phone: `http://localhost:5173`
- Large tap targets for staff use
- Bottom navigation for easy switching
- Optimized for portrait orientation

## ⚙️ Build for Production

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
```

## 🆘 Common Issues

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change PORT in .env |
| No users in DB | Run `npm run seed` in backend |
| Blank login screen | Check browser console, ensure backend running |
| Tasks not loading | Verify API running, check network tab |

---

**You're all set! Start both servers and navigate to http://localhost:5173** 🎉
