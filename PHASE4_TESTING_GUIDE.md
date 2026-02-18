# Phase 4 Testing Guide - Authentication & Admin Panel

## Quick Start Testing

### 1. Start the Application
```bash
npm run dev
```

### 2. Test Authentication Flow

#### Test 1: Login Redirect
1. Open browser to `http://localhost:5173`
2. **Expected**: Automatic redirect to `http://localhost:5173/#/login`
3. **Verify**: Login page displays with Bisedge branding

#### Test 2: Invalid Login
1. Enter username: `test`
2. Enter password: `wrong`
3. Click "Sign In"
4. **Expected**: Red error message "Invalid username or password"

#### Test 3: Valid Login
1. Enter username: `admin`
2. Enter password: `admin123`
3. Click "Sign In"
4. **Expected**:
   - Redirect to dashboard
   - Full quotation UI visible
   - "Admin" button visible in TopBar

#### Test 4: Auth Persistence
1. After logging in, refresh the page (F5)
2. **Expected**: Remains logged in, dashboard still visible

### 3. Test Admin Panel Access

#### Test 5: Navigate to Admin
1. From dashboard, click "Admin" button (with Settings icon)
2. **Expected**:
   - Navigate to `/#/admin/pricing`
   - Admin panel header shows "Admin Panel"
   - User info displayed: "System Administrator" with "ADMIN" badge
   - Sidebar shows 7 menu items

#### Test 6: Sidebar Navigation
1. Click each sidebar item:
   - Pricing & Tiers → Shows placeholder
   - Catalog → Shows placeholder
   - Users → Shows placeholder
   - Templates → Shows placeholder
   - Attachments → Shows placeholder
   - Audit Log → Shows placeholder
   - Backup & Restore → Shows placeholder
2. **Expected**: Active item highlighted with teal background

#### Test 7: Back to Dashboard
1. From admin panel, click "Back to Dashboard"
2. **Expected**: Returns to quotation dashboard

### 4. Test Authorization

#### Test 8: Logout
1. From admin panel, click "Logout" button (red button with logout icon)
2. **Expected**:
   - Redirect to login page
   - Auth state cleared
   - Cannot access dashboard without re-login

#### Test 9: Direct URL Access (Not Authenticated)
1. After logout, manually navigate to `http://localhost:5173/#/`
2. **Expected**: Immediate redirect to login page

#### Test 10: Direct Admin Access (Not Authenticated)
1. After logout, manually navigate to `http://localhost:5173/#/admin`
2. **Expected**: Immediate redirect to login page

### 5. Test Database & Audit

#### Test 11: Verify Admin User Creation
1. Open browser DevTools (F12)
2. Go to Application tab → IndexedDB → BisedgeQuotationDB → users
3. **Expected**:
   - One user record
   - username: "admin"
   - role: "admin"
   - fullName: "System Administrator"
   - email: "admin@bisedge.com"
   - isActive: true
   - passwordHash: (bcrypt hash starting with $2a$)

#### Test 12: Verify Audit Log
1. In DevTools, IndexedDB → BisedgeQuotationDB → auditLog
2. Login with admin/admin123
3. Check auditLog table
4. **Expected**:
   - New entry with action: "login"
   - entityType: "user"
   - userId matches admin user id
   - timestamp is current

### 6. Test Shared Components

#### Test 13: DataTable Component (Manual Test)
To test DataTable, temporarily add to a placeholder page:

```tsx
// In PricingManagement.tsx
import DataTable from '../shared/DataTable';

const sampleData = [
  { id: 1, name: 'Tier 1', min: 0, max: 50000, rate: 0.05 },
  { id: 2, name: 'Tier 2', min: 50000, max: 100000, rate: 0.04 },
];

const columns = [
  { key: 'name', label: 'Tier Name', sortable: true },
  { key: 'min', label: 'Min Value', sortable: true },
  { key: 'max', label: 'Max Value', sortable: true },
  { key: 'rate', label: 'Rate', sortable: true },
];

<DataTable
  columns={columns}
  data={sampleData}
  onEdit={(row) => console.log('Edit', row)}
  onDelete={(row) => console.log('Delete', row)}
/>
```

**Expected**:
- Table renders with all columns
- Click column headers to sort
- Type in search box to filter
- Edit/Delete icons appear
- Pagination shows if >10 items

### 7. Test Role-Based Access (Future)

To test different roles, you'll need to create test users:

#### Create Test Users (Via Console)
```javascript
// In browser console
const { db } = await import('./db/schema');
const bcrypt = await import('bcryptjs');

// Create Manager
await db.users.add({
  id: crypto.randomUUID(),
  username: 'manager',
  passwordHash: await bcrypt.hash('manager123', 10),
  role: 'manager',
  fullName: 'Test Manager',
  email: 'manager@bisedge.com',
  isActive: true,
  createdAt: new Date().toISOString(),
});

// Create Sales
await db.users.add({
  id: crypto.randomUUID(),
  username: 'sales',
  passwordHash: await bcrypt.hash('sales123', 10),
  role: 'sales',
  fullName: 'Test Sales',
  email: 'sales@bisedge.com',
  isActive: true,
  createdAt: new Date().toISOString(),
});
```

#### Test 14: Manager Role
1. Logout
2. Login as `manager` / `manager123`
3. **Expected**:
   - "Admin" button visible in TopBar
   - Admin sidebar shows: Pricing, Catalog, Templates (read-only items)
   - No Users, Audit, or Backup sections

#### Test 15: Sales Role
1. Logout
2. Login as `sales` / `sales123`
3. **Expected**:
   - NO "Admin" button in TopBar
   - Cannot access /admin routes
   - Can access dashboard and create quotes

## Automated Testing Checklist

- [ ] Navigate to / → redirects to /login
- [ ] Login with admin/admin123 → redirects to dashboard
- [ ] Click "Admin" button in TopBar → navigates to /admin/pricing
- [ ] Admin sidebar shows all menu items for admin user
- [ ] Click "Back to Dashboard" → returns to /
- [ ] Click "Logout" → returns to /login
- [ ] Try to access /admin without login → redirects to /login
- [ ] Login as sales user → "Admin" button hidden
- [ ] Try to navigate to /admin as sales → redirects to /
- [ ] Auth state persists after page refresh

## Common Issues & Solutions

### Issue: Login button does nothing
**Solution**: Check browser console for errors. Verify database is initialized.

### Issue: "Cannot read property 'role' of null"
**Solution**: User not logged in. Clear localStorage and try again.

### Issue: Admin button not visible
**Solution**: Check user role. Only admin/manager see this button.

### Issue: Redirect loop
**Solution**: Clear browser cache and localStorage, restart dev server.

### Issue: Database not seeded
**Solution**:
1. Open DevTools → Application → IndexedDB
2. Delete BisedgeQuotationDB
3. Refresh page to re-seed

## Performance Benchmarks

Expected timings:
- Initial app load: < 2s
- Login authentication: < 100ms
- Route navigation: < 50ms (instant)
- Database query: < 20ms
- Page refresh with auth: < 500ms

## Security Testing

### Test Password Hashing
1. DevTools → IndexedDB → users
2. Check passwordHash field
3. **Expected**: Starts with `$2a$10$` (bcrypt format)
4. **Should NOT**: See plain text password

### Test Auth State Isolation
1. Login as admin
2. Open new incognito window
3. Navigate to app
4. **Expected**: Not logged in (separate storage)

### Test Inactive User
1. In DevTools, find admin user in IndexedDB
2. Set `isActive: false`
3. Try to login
4. **Expected**: Login fails (even with correct password)

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if available)

## Next Steps After Testing

Once all tests pass:
1. Create test users for each role
2. Test permission boundaries
3. Proceed to Phase 5 implementation
4. Build actual admin management UIs

## Quick Reset

If you need to reset everything:

```javascript
// In browser console
const { resetDatabase } = await import('./db/seed');
await resetDatabase();
localStorage.clear();
location.reload();
```

This will:
- Clear all database tables
- Reseed default data
- Clear auth state
- Refresh the page

You'll be back to a fresh state with admin/admin123 login.
