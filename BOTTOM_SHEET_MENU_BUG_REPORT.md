# Bottom Sheet Menu Bug Report - History Feature Inaccessible

## Date
2026-02-24

## Test Environment
- URL: http://localhost:5173
- User: admin@restaurant.com
- Viewport: Mobile 390px (Chrome DevTools Responsive Mode)
- Theme: Dark mode
- Branch: cursor/development-environment-setup-06c4

## Issue Summary
The bottom sheet mobile menu (accessed via the three-dots "..." button in the mobile header) only displays 5 out of 7 expected menu items. The menu is not scrollable, making the "צוות" (Team) and "היסטוריה" (History) options completely inaccessible.

## Expected Behavior
According to the code in `/workspace/frontend/src/components/App.tsx` (lines 145-160), the bottom sheet menu should contain 7 items:
1. 🚪 יציאה (Logout)
2. ⚙️ ניהול אירועים (Event Management)
3. 🔔 התראות (Notifications)  
4. 👤 אישור משתמשים (User Approvals)
5. ⚙️ סטטוסים (Statuses)
6. 👥 צוות (Team) - **MISSING**
7. 📜 היסטוריה (History) - **MISSING**

The menu should either:
- Display all 7 items in the visible area, OR
- Be scrollable to access items 6 and 7

## Actual Behavior
The bottom sheet menu only displays 5 items:
1. 👥 משתמשים (Users)
2. ⚠️ התראות (Notifications)
3. ✅ אישור משתמשים (User Approvals)
4. ⚙️ סטטוסים (Statuses)
5. 🏷️ תגיות (Tags)

The menu appears to be cut off at the bottom with no scroll functionality. Items 6 and 7 ("צוות" and "היסטוריה") are not visible and cannot be accessed.

## Steps to Reproduce
1. Open Chrome at http://localhost:5173
2. Log in as admin@restaurant.com / password123
3. Press Ctrl+Shift+R to hard reload
4. Open Chrome DevTools (F12)
5. Enable responsive mode (Ctrl+Shift+M) and set viewport to 390px width
6. In the mobile header, click the "..." (three dots) button on the left side
7. Observe the bottom sheet menu that appears
8. Attempt to scroll within the menu to reveal additional items

## Attempted Workarounds
### UI Interaction
- ❌ Mouse wheel scrolling in menu area - no effect
- ❌ Click and drag scrolling in menu area - no effect
- ❌ Keyboard Page Down while menu focused - no effect

### Programmatic Access (Browser Console)
- ❌ `[...document.querySelectorAll('button')].find(b => b.textContent.includes('היסטוריה'))` - returned `undefined`
- ❌ Button does not exist in accessible DOM

## Impact
- **Severity: HIGH** - The "היסטוריה" (Task History) feature is completely inaccessible on mobile viewports
- Users cannot view task status change history on mobile devices
- The "צוות" (Team) management feature is also inaccessible on mobile

## Screenshots
- Initial menu opening: `/tmp/computer-use/9554b.webp`
- Menu showing only 5 items (clear view): `/tmp/computer-use/67d74.webp`
- Console showing undefined button search: (logged in DevTools)

## Code References
- Menu definition: `/workspace/frontend/src/components/App.tsx` lines 145-160
- Mobile menu button: `/workspace/frontend/src/components/App.tsx` lines 92-97
- Desktop history button (works): `/workspace/frontend/src/components/App.tsx` line 178

## Notes
- User mentioned that "Vite dev server has code updates" suggesting a fix was attempted
- The bug persists despite the mentioned code updates
- The desktop view does have a direct "📜 היסטוריה" button that works (line 178), but this is hidden on mobile (uses `hidden md:flex` classes)
- The mobile three-dots menu button and bottom sheet do render correctly, but the menu content is truncated

## Recommended Fix
Investigate the bottom sheet menu component's CSS and ensure:
1. The menu container has proper `overflow-y: auto` or `overflow-y: scroll` styling
2. The menu has a max-height that fits within the viewport
3. All 7 menu items are rendered in the DOM (currently only 5 seem to be rendered)
4. The menu positioning doesn't cause items to be clipped behind the bottom navigation bar

## Status
🔴 **UNRESOLVED** - History feature remains inaccessible on mobile viewports
