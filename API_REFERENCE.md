# 🔌 API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints except `/auth/*` require JWT token in header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@restaurant.com",
  "name": "John Doe",
  "password": "secure_password",
  "role": "staff",
  "restaurant_id": 1
}
```

**Response (201)**
```json
{
  "user": {
    "id": 5,
    "email": "user@restaurant.com",
    "name": "John Doe",
    "role": "staff",
    "restaurant_id": 1
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "manager@downtown.com",
  "password": "password123"
}
```

**Response (200)**
```json
{
  "user": {
    "id": 2,
    "email": "manager@downtown.com",
    "name": "Maria Manager",
    "role": "manager",
    "restaurant_id": 1
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 📋 Task Endpoints

### Get All Tasks
```http
GET /tasks
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - Filter by status (planned, assigned, in_progress, waiting, completed, verified, overdue)
- `assigned_to` - Filter by user ID

**Example:**
```
GET /tasks?status=in_progress&assigned_to=5
```

**Response (200)**
```json
[
  {
    "id": 1,
    "title": "Opening Checklist",
    "description": "Complete all opening procedures...",
    "assigned_to": 5,
    "assigned_to_name": "John Waiter",
    "priority": "high",
    "status": "in_progress",
    "due_date": "2024-01-25T06:00:00Z",
    "recurrence": "daily",
    "created_at": "2024-01-24T10:00:00Z",
    "completed_at": null,
    "verified_at": null,
    "restaurant_id": 1
  }
]
```

### Get Task Details
```http
GET /tasks/:id
Authorization: Bearer <token>
```

**Response (200)**
```json
{
  "id": 1,
  "title": "Opening Checklist",
  "description": "...",
  "assigned_to": 5,
  "assigned_to_name": "John Waiter",
  "priority": "high",
  "status": "in_progress",
  "due_date": "2024-01-25T06:00:00Z",
  "recurrence": "daily",
  "created_at": "2024-01-24T10:00:00Z",
  "completed_at": null,
  "verified_at": null,
  "checklists": [
    {
      "id": 1,
      "task_id": 1,
      "item": "Unlock front doors",
      "completed": true,
      "completed_at": "2024-01-25T05:30:00Z"
    }
  ],
  "comments": [
    {
      "id": 1,
      "task_id": 1,
      "user_id": 2,
      "user_name": "Maria Manager",
      "content": "Remember to check the thermometer",
      "created_at": "2024-01-24T10:30:00Z"
    }
  ],
  "photos": [
    {
      "id": 1,
      "task_id": 1,
      "filename": "proof_123.jpg",
      "filepath": "/uploads/proof_123.jpg",
      "uploaded_at": "2024-01-25T06:00:00Z"
    }
  ]
}
```

### Create Task
```http
POST /tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Clean Kitchen Stations",
  "description": "Deep clean all kitchen prep stations",
  "assigned_to": 5,
  "priority": "high",
  "due_date": "2024-01-25T14:00:00Z",
  "recurrence": "daily"
}
```

**Required Role:** manager, admin

**Response (201)**
```json
{
  "id": 4,
  "title": "Clean Kitchen Stations",
  "description": "Deep clean all kitchen prep stations",
  "assigned_to": 5,
  "priority": "high",
  "status": "assigned",
  "due_date": "2024-01-25T14:00:00Z",
  "recurrence": "daily",
  "created_at": "2024-01-24T15:30:00Z",
  "created_by": 2,
  "restaurant_id": 1
}
```

### Update Task
```http
PUT /tasks/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "priority": "critical",
  "status": "waiting",
  "assigned_to": 6
}
```

**Required Role:** manager, admin

**Response (200)**
```json
{
  "id": 1,
  "title": "Updated Title",
  "priority": "critical",
  "status": "waiting",
  "assigned_to": 6,
  ...
}
```

### Mark Task Complete
```http
PUT /tasks/:id/complete
Authorization: Bearer <token>
```

**Required Role:** staff (must be assigned user), manager, admin

**Response (200)**
```json
{
  "id": 1,
  "title": "Opening Checklist",
  "status": "completed",
  "completed_at": "2024-01-25T06:30:00Z",
  ...
}
```

### Verify Task
```http
PUT /tasks/:id/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "comment": "Looks good! Nice work."
}
```

**Required Role:** manager, admin

**Response (200)**
```json
{
  "id": 1,
  "title": "Opening Checklist",
  "status": "verified",
  "verified_at": "2024-01-25T07:00:00Z",
  "verified_by": 2,
  ...
}
```

### Delete Task
```http
DELETE /tasks/:id
Authorization: Bearer <token>
```

**Required Role:** manager, admin

**Response (200)**
```json
{
  "message": "Task deleted"
}
```

---

## 📊 Dashboard Endpoints

### Get Overview Stats
```http
GET /dashboard/stats/overview
Authorization: Bearer <token>
```

**Required Role:** manager, admin

**Response (200)**
```json
{
  "totalTasks": 25,
  "completedTasks": 18,
  "completionRate": 72,
  "overdueTasks": 2,
  "inProgressTasks": 4
}
```

### Get Staff Performance
```http
GET /dashboard/stats/staff-performance
Authorization: Bearer <token>
```

**Required Role:** manager, admin

**Response (200)**
```json
[
  {
    "id": 5,
    "name": "John Waiter",
    "total_assigned": 12,
    "completed": 11,
    "in_progress": 1,
    "overdue": 0
  },
  {
    "id": 6,
    "name": "Sarah Chef",
    "total_assigned": 8,
    "completed": 6,
    "in_progress": 1,
    "overdue": 1
  }
]
```

### Get Tasks by Priority
```http
GET /dashboard/stats/tasks-by-priority
Authorization: Bearer <token>
```

**Required Role:** manager, admin

**Response (200)**
```json
[
  {
    "priority": "critical",
    "count": 3,
    "completed": 2,
    "in_progress": 1,
    "overdue": 0
  },
  {
    "priority": "high",
    "count": 8,
    "completed": 6,
    "in_progress": 1,
    "overdue": 1
  },
  {
    "priority": "medium",
    "count": 10,
    "completed": 8,
    "in_progress": 2,
    "overdue": 0
  },
  {
    "priority": "low",
    "count": 4,
    "completed": 2,
    "in_progress": 2,
    "overdue": 0
  }
]
```

### Get Overdue Tasks
```http
GET /dashboard/stats/overdue-tasks
Authorization: Bearer <token>
```

**Required Role:** manager, admin

**Response (200)**
```json
[
  {
    "id": 2,
    "title": "Inventory Count",
    "assigned_to": 5,
    "assigned_to_name": "John Waiter",
    "priority": "high",
    "status": "assigned",
    "due_date": "2024-01-23T18:00:00Z",
    "created_by_name": "Maria Manager"
  },
  {
    "id": 3,
    "title": "Equipment Maintenance",
    "assigned_to": 6,
    "assigned_to_name": "Sarah Chef",
    "priority": "critical",
    "status": "in_progress",
    "due_date": "2024-01-24T10:00:00Z",
    "created_by_name": "Maria Manager"
  }
]
```

---

## Health Check
```http
GET /health
```

**Response (200)**
```json
{
  "status": "ok",
  "timestamp": "2024-01-24T15:30:00.000Z"
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 - Unauthorized
```json
{
  "error": "No token provided"
}
```

### 403 - Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 - Not Found
```json
{
  "error": "Task not found"
}
```

### 409 - Conflict
```json
{
  "error": "Email already registered"
}
```

### 500 - Server Error
```json
{
  "error": "Failed to [operation]"
}
```

---

## Rate Limiting
Currently no rate limiting. Production deployment should implement:
- 100 requests per minute per IP
- 1000 requests per hour per user
- Custom limits for sensitive endpoints

## CORS
Enabled for all origins. Production should restrict to frontend domain.
