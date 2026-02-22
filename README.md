# Mission Tracking System

A mobile-first task management system for restaurants, built with React + Node.js.

## Features

- Task management with drag-and-drop Kanban board
- User roles: Admin, Maintainer, Worker
- Email notifications for task assignments and reminders
- Hebrew language support (RTL)
- Dark/Light mode
- Tag system with gradients
- Statistics dashboard

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, Zustand
- **Backend**: Node.js, Express, TypeScript, Vercel Postgres (Neon)
- **Email**: Nodemailer / SendGrid

## Quick Start

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Deploy to Vercel

1. Connect the repo to Vercel. Add **Vercel Postgres** from the Storage tab and link it to the project.
2. Run the DB schema once (Vercel Postgres SQL tab or `psql $POSTGRES_URL -f backend/src/db/schema.sql`).
3. Set environment variables: `POSTGRES_URL`, `JWT_SECRET`, `CRON_SECRET`, and optionally `SENDGRID_API_KEY`, `EMAIL_FROM`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
4. Deploy. The `vercel.json` build runs backend + frontend; `/api/*` is served by the serverless API. Cron jobs hit `/api/cron/daily-notifications` (hourly) and `/api/cron/push-scheduled` (every minute; Pro plan).

## Default Login

```
Email: admin@restaurant.com
Password: password123
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment instructions.
