# 🧪 Testing Guide

## Testing Strategy

The app includes:
- **Manual testing** via the UI
- **API testing** with curl or Postman
- **Component testing** (ready for Jest/Vitest)
- **Integration testing** (ready for automated tests)

---

## Manual Testing Scenarios

### Scenario 1: Staff Completes Task

1. **Login as staff** (john@downtown.com)
2. **View Daily Tasks** - See assigned tasks
3. **Click a task** - "Clean Kitchen Stations"
4. **Mark as Complete**
   - Task status changes to "Completed"
   - Timestamp recorded
5. **Verify** - Task now waiting for manager verification

### Scenario 2: Manager Verifies Task

1. **Login as manager** (manager@downtown.com)
2. **Go to Kanban Board**
3. **See task in "Completed" column**
4. **Click task**
5. **Add verification comment** - "Great work!"
6. **Click "Verify"**
   - Task moves to "Verified"
   - Shows in completion metrics

### Scenario 3: Create Recurring Task

1. **Login as manager**
2. **Click "Create Task"**
3. **Fill form:**
   - Title: "Opening Checklist"
   - Priority: "High"
   - Recurrence: "Daily"
   - Due Date: Tomorrow at 6:00 AM
   - Assign to: John Waiter
4. **Submit**
5. **Verify:**
   - Task appears in task list
   - Shows 🔄 daily badge
   - Appears in John's daily tasks

### Scenario 4: Dashboard Analytics

1. **Login as manager**
2. **Go to Dashboard**
3. **Verify metrics displayed:**
   - Total Tasks: 25
   - Completed: 18
   - Completion Rate: 72%
   - Overdue: 2
4. **Check Staff Performance:**
   - Shows John: 12 assigned, 11 completed
   - Progress bar shows 91.7%
5. **Check Overdue Tasks:**
   - Lists tasks past deadline
   - Color-coded red

### Scenario 5: Filter & Search

1. **Login as staff**
2. **On Daily List, click "Urgent"**
   - Shows only High & Critical priority
3. **Click "Overdue"**
   - Shows only past-due tasks
4. **Click "Today"**
   - Shows only tasks due today
5. **Back to "All"**
   - Shows all tasks

### Scenario 6: Mobile Experience

1. **Open on phone/tablet**
2. **Verify responsive layout:**
   - Bottom navigation appears
   - Single column layout
   - Large buttons for touch
3. **Test each tab**
4. **Create task on mobile** (swipe to trigger)

---

## API Testing with Curl

### Test Authentication

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@restaurant.com",
    "name": "Test User",
    "password": "password123",
    "role": "staff"
  }'

# Save token from response
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@downtown.com",
    "password": "password123"
  }'
```

### Test Tasks Endpoint

```bash
# Get all tasks
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/tasks

# Get specific task
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/tasks/1

# Create task (manager only)
curl -X POST http://localhost:5000/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "description": "Testing",
    "priority": "high",
    "assigned_to": 5,
    "due_date": "2024-01-26T14:00:00Z",
    "recurrence": "once"
  }'

# Mark complete (assigned staff only)
curl -X PUT http://localhost:5000/api/tasks/1/complete \
  -H "Authorization: Bearer $TOKEN"

# Verify task (manager only)
curl -X PUT http://localhost:5000/api/tasks/1/verify \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "Excellent work!"
  }'
```

### Test Dashboard Endpoints

```bash
# Get overview stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/dashboard/stats/overview

# Get staff performance
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/dashboard/stats/staff-performance

# Get overdue tasks
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/dashboard/stats/overdue-tasks
```

---

## Postman Collection

Import this into Postman:

```json
{
  "info": {
    "name": "Restaurant Task Manager API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"test@restaurant.com\",\"name\":\"Test\",\"password\":\"password123\",\"role\":\"staff\"}"
            },
            "url": {
              "raw": "http://localhost:5000/api/auth/register",
              "protocol": "http",
              "host": ["localhost"],
              "port": "5000",
              "path": ["api", "auth", "register"]
            }
          }
        },
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\"email\":\"manager@downtown.com\",\"password\":\"password123\"}"
            },
            "url": {
              "raw": "http://localhost:5000/api/auth/login",
              "protocol": "http",
              "host": ["localhost"],
              "port": "5000",
              "path": ["api", "auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "Tasks",
      "item": [
        {
          "name": "Get All Tasks",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "http://localhost:5000/api/tasks",
              "protocol": "http",
              "host": ["localhost"],
              "port": "5000",
              "path": ["api", "tasks"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## Browser Console Testing

```javascript
// Check if token is saved
localStorage.getItem('token');

// Check user data
JSON.parse(localStorage.getItem('user'));

// Clear data (for testing)
localStorage.clear();

// Test API call directly
fetch('/api/tasks', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
}).then(r => r.json()).then(console.log);
```

---

## Common Testing Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized errors | Check token in localStorage, login again |
| 403 Forbidden | Check user role for endpoint access |
| Tasks not showing | Verify restaurant_id matches, try filtering |
| API not responding | Check backend is running on port 5000 |
| Frontend blank | Check browser console for JS errors |
| Buttons not working | Clear cache, hard refresh (Ctrl+Shift+R) |

---

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test API endpoint
ab -n 1000 -c 50 http://localhost:5000/api/health

# Expected: 50+ requests per second
```

### Load Testing with wrk

```bash
# Install wrk: https://github.com/wg/wrk
wrk -t4 -c100 -d30s http://localhost:5000/api/tasks
```

### Frontend Performance

```javascript
// In browser console
performance.measure('pageLoad');
performance.getEntriesByType('navigation')[0].loadEventEnd
```

---

## Database Testing

```bash
# Check database
sqlite3 backend/restaurant.db

# Count tasks
SELECT COUNT(*) FROM tasks;

# Check users
SELECT id, email, name, role FROM users;

# View all tasks
SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5;

# Test with specific status
SELECT * FROM tasks WHERE status = 'in_progress';
```

---

## Accessibility Testing

- [ ] Keyboard navigation (Tab key works)
- [ ] Screen reader support (use NVDA)
- [ ] Color contrast ratio > 4.5:1
- [ ] All buttons have labels
- [ ] Images have alt text
- [ ] Form labels associated with inputs
- [ ] Mobile touch targets ≥ 44x44px

---

## Browser Compatibility Testing

Test on:
- [ ] Chrome/Edge (Latest)
- [ ] Firefox (Latest)
- [ ] Safari (Latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari
- [ ] Samsung Internet

---

## Continuous Integration Testing

### Jest Unit Tests

```bash
# In frontend
npm test -- --coverage

# Expected: >80% coverage
```

### E2E Testing with Cypress

```bash
npm install --save-dev cypress

# Write tests in cypress/e2e/
# Run with: npx cypress open
```

Example test:
```javascript
// cypress/e2e/login.cy.js
describe('Login Flow', () => {
  it('should login with valid credentials', () => {
    cy.visit('http://localhost:5173');
    cy.get('input[type="email"]').type('manager@downtown.com');
    cy.get('input[type="password"]').type('password123');
    cy.get('button').contains('Login').click();
    cy.contains('Daily List').should('be.visible');
  });
});
```

---

## Regression Testing Checklist

Before each release:
- [ ] Login works for all roles
- [ ] Create/edit/delete tasks
- [ ] Filter and search tasks
- [ ] Mark task complete
- [ ] Verify task completion
- [ ] Dashboard loads and shows correct data
- [ ] All API endpoints respond
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Database backup works

---

**Testing ensures quality and reliability! 🧪**
