# Bug Report: Task Creation Failure via UI

## Issue
Task creation through the web UI fails with HTTP 500 Internal Server Error.

## Root Cause
The frontend `CreateTaskModal` component includes a "station" dropdown field that sends a `station` property in the task creation request. However, the PostgreSQL `tasks` table schema does not have a `station` column, causing the database INSERT to fail.

## Error Details
- **Frontend**: Sends `station` field in POST /api/tasks request body
- **Backend**: Attempts to INSERT task with station field
- **Database**: Rejects with "column 'station' of relation 'tasks' does not exist"
- **Result**: Backend catches error and returns generic 500 error to client

## Verification
```bash
# Database schema check confirms no station column
psql -c "\d tasks"
# Shows: id, title, description, assigned_to, restaurant_id, priority, status, due_date, estimated_time, recurrence, created_by, created_at, updated_at, completed_at, verified_at, verified_by
# No "station" column present
```

## Workaround
Task creation works when bypassing the UI:
```sql
INSERT INTO tasks (title, description, assigned_to, restaurant_id, priority, status, created_by, created_at) 
VALUES ('Test Task from Cloud Agent', 'Testing dev environment setup', 2, 1, 'high', 'assigned', 1, NOW());
```

## Recommended Fix
**Option 1** (Remove station field from UI):
- Remove station dropdown from `frontend/src/components/CreateTaskModal.tsx`

**Option 2** (Add station column to database):
- Add migration to add `station TEXT` column to tasks table
- Update backend validation to accept station field

## Test Results
- ✅ Application infrastructure working (servers running, database connected)
- ✅ Task creation successful via direct database INSERT
- ✅ Task displays correctly on Kanban board
- ❌ Task creation via UI blocked by schema mismatch bug

## Evidence
- Task ID 5 successfully created with title "Test Task from Cloud Agent"
- Task visible on board with correct priority (high) and description
- Assigned to Worker (Maintainer role)
