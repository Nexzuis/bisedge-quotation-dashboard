# Phase 4 - Quick Start Guide

## 🚀 Start the Application

```bash
npm run dev
```

Then open: http://localhost:5173

## 🔐 Login Credentials

**Default Admin Account:**
- Username: `admin`
- Password: `admin123`
- Role: Administrator (full access)

## 📱 What You'll See

### 1. Login Page
- Professional glassmorphic design
- Bisedge branding
- Username/password form
- Error messages for invalid credentials
- Auto-redirect on successful login

### 2. Main Dashboard (After Login)
- Full quotation system (existing functionality)
- **NEW: "Admin" button** in top right (Settings icon)
- Available to admin and manager roles only
- Click to access admin panel

### 3. Admin Panel
**Header (Top Bar):**
- "Back to Dashboard" button
- "Admin Panel" title
- User info: "System Administrator" + "ADMIN" badge
- Red "Logout" button

**Sidebar (Left Navigation):**
- Pricing & Tiers
- Catalog
- Users
- Templates
- Attachments
- Audit Log
- Backup & Restore

**Content Area:**
- Placeholder pages (ready for Phase 5)
- Each shows "Coming in Phase 5..." message

## 🎯 Key Features to Test

### Authentication Flow
1. **Login** → Enter credentials → Click "Sign In"
2. **Auto-redirect** → Dashboard appears
3. **Persistence** → Refresh page → Still logged in
4. **Logout** → Click logout → Back to login page

### Navigation
1. **Admin Access** → Click "Admin" button → Admin panel opens
2. **Sidebar Nav** → Click any menu item → Page changes
3. **Active State** → Current page highlighted in teal
4. **Back Button** → Returns to dashboard
5. **Logout** → Clears session and redirects

### Role-Based Access
- **Admin/Manager**: See "Admin" button, access all admin pages
- **Sales/Viewer**: No "Admin" button, cannot access /admin routes

## 📁 Project Structure

```
src/
├── auth/
│   └── permissions.ts              ← Role definitions & permissions
│
├── store/
│   └── useAuthStore.ts             ← Authentication state
│
├── components/
│   ├── auth/
│   │   ├── AuthContext.tsx         ← Auth React context
│   │   └── LoginPage.tsx           ← Login UI
│   │
│   ├── admin/
│   │   ├── AdminLayout.tsx         ← Main admin layout
│   │   │
│   │   ├── layout/
│   │   │   ├── AdminTopBar.tsx     ← Header with user info
│   │   │   └── AdminSidebar.tsx    ← Navigation menu
│   │   │
│   │   ├── shared/
│   │   │   ├── DataTable.tsx       ← Reusable table component
│   │   │   ├── EditModal.tsx       ← Reusable edit modal
│   │   │   └── ConfirmDialog.tsx   ← Confirmation dialogs
│   │   │
│   │   ├── pricing/
│   │   │   └── PricingManagement.tsx
│   │   ├── catalog/
│   │   │   └── CatalogManagement.tsx
│   │   ├── users/
│   │   │   └── UserManagement.tsx
│   │   └── templates/
│   │       └── TemplateManagement.tsx
│   │
│   └── layout/
│       └── TopBar.tsx              ← Updated with Admin button
│
├── db/
│   ├── schema.ts                   ← Database tables
│   ├── seed.ts                     ← Default data
│   └── interfaces.ts               ← Type definitions
│
├── App.tsx                         ← Routing & auth guards
└── Dashboard.tsx                   ← Dashboard wrapper
```

## 🔧 Developer Tools

### View Database
1. Open DevTools (F12)
2. Go to: Application → IndexedDB → BisedgeQuotationDB
3. Tables:
   - **users** → User accounts
   - **auditLog** → All system events
   - **quotes** → Saved quotes
   - **forkliftModels** → Product catalog
   - **batteryModels** → Battery catalog
   - **approvalTiers** → Approval workflow
   - **commissionTiers** → Commission rates
   - **residualCurves** → Residual values
   - **templates** → T&C templates
   - **attachments** → Forklift attachments

### View Auth State
```javascript
// In browser console
JSON.parse(localStorage.getItem('auth-storage'))
```

### Create Test Users
```javascript
// In browser console
const { db } = await import('./db/schema');
const bcrypt = await import('bcryptjs');

// Create a Manager
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

// Create a Sales User
await db.users.add({
  id: crypto.randomUUID(),
  username: 'sales',
  passwordHash: await bcrypt.hash('sales123', 10),
  role: 'sales',
  fullName: 'Test Sales Rep',
  email: 'sales@bisedge.com',
  isActive: true,
  createdAt: new Date().toISOString(),
});
```

### Reset Database
```javascript
// In browser console
const { resetDatabase } = await import('./db/seed');
await resetDatabase();
localStorage.clear();
location.reload();
```

## 🎨 UI Components Available

### DataTable
Generic sortable, filterable, paginated table:
```tsx
import DataTable from '../shared/DataTable';

<DataTable
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'value', label: 'Value', sortable: true }
  ]}
  data={myData}
  onEdit={(row) => handleEdit(row)}
  onDelete={(row) => handleDelete(row)}
  onExport={() => exportToExcel()}
/>
```

### EditModal
Slide-over modal for editing:
```tsx
import EditModal from '../shared/EditModal';

<EditModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Edit Item"
  onSave={handleSave}
>
  {/* Your form fields here */}
</EditModal>
```

### ConfirmDialog
Confirmation dialogs:
```tsx
import ConfirmDialog from '../shared/ConfirmDialog';

<ConfirmDialog
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete Item?"
  message="This action cannot be undone."
  variant="danger"
  confirmText="Delete"
/>
```

## 🔐 Permission System

### Check Permissions
```tsx
import { useAuth } from '../auth/AuthContext';
import { hasPermission } from '../../auth/permissions';

const { user } = useAuth();

// Check if user can edit pricing
if (hasPermission(user!.role, 'admin:pricing', 'update')) {
  // Show edit button
}
```

### Permission Matrix
```typescript
// admin - Full access to everything
// manager - Read-only admin access, full quotes
// sales - Create/edit quotes only
// viewer - Read-only quotes
```

## 📊 Routes

| Path | Access | Description |
|------|--------|-------------|
| `/login` | Public | Login page |
| `/` | Protected | Main quotation dashboard |
| `/admin` | Admin/Manager | Redirects to /admin/pricing |
| `/admin/pricing` | Admin/Manager | Pricing management |
| `/admin/catalog` | Admin/Manager | Catalog management |
| `/admin/users` | Admin only | User management |
| `/admin/templates` | Admin/Manager | Template management |
| `/admin/attachments` | Admin/Manager | Attachments management |
| `/admin/audit` | Admin only | Audit log viewer |
| `/admin/backup` | Admin only | Backup & restore |

## 🚨 Common Issues

### Login Not Working
- Check console for errors
- Verify database is seeded: Check IndexedDB → users table
- Try resetting database (see commands above)

### Admin Button Not Visible
- Check user role in database
- Only admin and manager see this button
- Sales and viewer roles don't have access

### Page Refresh Logs Out
- Check browser console for errors
- Verify localStorage.getItem('auth-storage') exists
- Try clearing localStorage and logging in again

### Route Redirects Not Working
- Check browser console for routing errors
- Verify react-router-dom is installed
- Refresh page if routes don't update

## 📝 Next Steps (Phase 5)

Implement actual admin functionality:

1. **Pricing Management**
   - CRUD for approval tiers
   - CRUD for commission tiers
   - Edit residual curves
   - Configure default rates

2. **Catalog Management**
   - Add/edit/delete forklift models
   - Add/edit/delete battery models
   - Import/export catalog

3. **User Management**
   - Create/edit/delete users
   - Change passwords
   - Assign roles
   - View activity

4. **Template Management**
   - Edit T&C template
   - Edit cover letter
   - Version control

## 📚 Documentation

- **PHASE4_COMPLETE.md** → Executive summary
- **PHASE4_IMPLEMENTATION_SUMMARY.md** → Technical details
- **PHASE4_TESTING_GUIDE.md** → Step-by-step testing
- **PHASE4_FILES_CREATED.md** → File manifest

## ✅ Verification Checklist

Before proceeding to Phase 5, verify:

- [ ] Can login with admin/admin123
- [ ] Login redirects to dashboard
- [ ] Admin button visible in TopBar
- [ ] Admin panel loads with sidebar
- [ ] All 7 sidebar items clickable
- [ ] Back to Dashboard works
- [ ] Logout works and redirects
- [ ] Auth persists on page refresh
- [ ] Direct /admin URL requires auth
- [ ] Database has admin user
- [ ] Audit log shows login events

## 🎓 For New Developers

1. **Read**: PHASE4_COMPLETE.md
2. **Run**: `npm run dev`
3. **Login**: admin / admin123
4. **Explore**: Click around the admin panel
5. **Check Database**: Open DevTools → IndexedDB
6. **Start Building**: Pick a page from Phase 5 to implement

All infrastructure is ready. You can start implementing actual admin functionality immediately using the shared components (DataTable, EditModal, ConfirmDialog).

## 🚀 Ready to Build!

Everything is in place for Phase 5. The foundation is solid, tested, and ready for the actual management interfaces.

Happy coding! 🎉
