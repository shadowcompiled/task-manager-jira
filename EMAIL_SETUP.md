# Email Configuration Guide

## Overview
The application is now configured to send email notifications for:
- **Expiring Missions**: When a mission is 2/3 complete with no status change in the threshold period
- **Task Assignments**: When a user is assigned to a task

## Gmail SMTP Setup (Required)

### Prerequisites
1. A Gmail account (e.g., `oshige2025@gmail.com`)
2. Google Account with 2-Factor Authentication enabled
3. Access to create App Passwords

### Step-by-Step Setup

#### Step 1: Enable 2-Factor Authentication
1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Click "Security" in the left menu
3. Find "2-Step Verification" and enable it
4. Follow Google's prompts to verify

#### Step 2: Create App Password
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. You may need to re-authenticate
3. Select "Mail" and "Windows Computer" (or your device type)
4. Google will generate a 16-character password
5. **Copy this password** - you'll need it in the next step

#### Step 3: Update .env File
The `.env` file is already created in `backend/` with the following template:

```bash
# Email Configuration - Gmail SMTP
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=oshige2025@gmail.com
EMAIL_PASSWORD=your-app-password-here    # Replace with your 16-char App Password
EMAIL_FROM=Restaurant Management <oshige2025@gmail.com>
ADMIN_EMAIL=oser130309@gmail.com
```

**Action Required:**
- Replace `your-app-password-here` with the 16-character password from Step 2
- Keep the rest of the settings as-is

#### Step 4: Verify Configuration
When you start the backend server, you'll see:
```
✓ Email service configured successfully
```

Or if there's an issue:
```
⚠️ Email service not configured: [error message]
```

## Features Enabled

### 1. Expiration Notifications
- **Trigger**: When a mission reaches 2/3 completion WITHOUT any status change
- **Frequency**: Checked hourly (automatic)
- **Recipients**: Person assigned to the mission
- **Language**: Hebrew with task details

### 2. Assignment Notifications
- **Trigger**: When a mission is assigned to a staff member
- **Recipients**: The assigned staff member
- **Language**: Hebrew with mission details

## Frontend Updates

### New Field: Estimated Time
When creating a new mission, you can now specify:
- **Estimated Time (דקות)**: Enter minutes (e.g., 15 minutes, 120 for 2 hours)
- Displays automatically on task cards as: ⏱️ 15 דקות / ⏱️ 2 שעות / ⏱️ 1 ימים

### Mobile Optimization
The Kanban board is now fully responsive:
- **Desktop**: 4 columns side-by-side
- **Tablet**: 2-3 columns with grid layout
- **Mobile**: Horizontal scroll with narrower columns (56px width)
- **Drag-and-Drop**: Fully functional on all devices

### Owner-Only Access
- Dashboard is now restricted to Admin/Manager users only
- Staff see a message: "לוח בקרה זמין לבעלי משימות בלבד"

## Testing Email

### Test 1: Create a Mission
1. Go to Create Task modal
2. Fill in all fields
3. Set "Estimated Time" to any number (e.g., 30)
4. Submit
5. The task will appear in "מתוכנן" column

### Test 2: Simulate Expiration Check
The background service runs automatically every hour. To test manually:
1. Update a task's status to "בתהליך" (in_progress)
2. Wait for the next hour-mark OR restart the backend
3. If 2/3 time has passed with no status change, the staff member receives an email

### Test 3: Email Verification
1. Check spam folder first (Gmail may filter test emails)
2. Verify email arrives with:
   - Subject: משימה עתידה לפוג (Task about to expire)
   - Task title and details
   - Link to dashboard

## Troubleshooting

### "Email service not configured"
- ✓ Check `.env` file exists in `backend/` folder
- ✓ Verify all EMAIL_* variables are set
- ✓ Restart the backend server

### "Invalid SMTP credentials"
- ✓ You used the wrong password (use App Password, NOT your Google password)
- ✓ App Password was entered without spaces - remove them if pasted: `abc def ghi jkl` → `abcdefghijkl`
- ✓ Your Google account email is correct in EMAIL_USER

### "Connection timeout"
- ✓ Check your internet connection
- ✓ Gmail SMTP might be blocked by your network firewall
- ✓ Try EMAIL_PORT: 465 with EMAIL_SECURE: true (requires restart)

### Emails Not Sending
1. Verify configuration is correct:
   ```bash
   # In backend folder
   npm run dev
   # Should show: ✓ Email service configured successfully
   ```

2. Check logs for errors during mission creation/assignment

3. Verify recipient email address is correct

## Database Changes

Added new fields to tasks table:
- `estimated_time` (INTEGER): Time in minutes (optional)

New tables for tracking:
- Task status history is automatically recorded

## Environment Variables Reference

| Variable | Example | Purpose |
|----------|---------|---------|
| EMAIL_HOST | smtp.gmail.com | SMTP server address |
| EMAIL_PORT | 587 | SMTP port (Gmail uses 587 for TLS) |
| EMAIL_SECURE | false | Use TLS encryption (false for port 587) |
| EMAIL_USER | oshige2025@gmail.com | Sender email address |
| EMAIL_PASSWORD | [16-char App Password] | Gmail App Password |
| EMAIL_FROM | Restaurant Management | Display name in emails |
| ADMIN_EMAIL | oser130309@gmail.com | Admin notification recipient (optional) |

## Next Steps

1. **Update .env** with your App Password
2. **Restart backend server**: `npm run dev`
3. **Test email sending** by creating a mission and assigning it
4. **Monitor console logs** for any email service errors

---

**Support**: If emails still don't send after following this guide, check:
- Gmail's app password was created correctly
- Your Google account has 2FA enabled
- The password is entered without spaces in .env
- Backend logs show no "Email service not configured" warning
