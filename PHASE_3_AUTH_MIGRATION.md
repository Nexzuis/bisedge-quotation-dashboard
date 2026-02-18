# 🔐 Phase 3: Authentication Migration Guide

## ✅ What Was Implemented

Phase 3 replaces local bcrypt authentication with Supabase Auth for multi-user enterprise access.

### Files Created:

1. **`src/store/useAuthStore.v2.ts`** ✅
   - Dual-mode auth (local bcrypt OR Supabase)
   - JWT session management
   - Auto-refresh tokens
   - Sign up, password reset, password update

2. **`src/components/auth/LoginPage.v2.tsx`** ✅
   - Dual-mode login UI
   - Email login for cloud mode
   - Username login for local mode
   - Password reset flow (cloud only)
   - Mode indicator badge

---

## 🚀 How to Activate New Auth

Currently, your app is still using the **old auth** (`useAuthStore.ts`).

To switch to the new Supabase auth:

### Step 1: Backup Old Files (Safety)
```bash
# In your project folder
copy src\store\useAuthStore.ts src\store\useAuthStore.old.ts
copy src\components\auth\LoginPage.tsx src\components\auth\LoginPage.old.tsx
```

### Step 2: Replace with New Versions
```bash
# Delete old files
del src\store\useAuthStore.ts
del src\components\auth\LoginPage.tsx

# Rename new versions to active
rename src\store\useAuthStore.v2.ts useAuthStore.ts
rename src\components\auth\LoginPage.v2.tsx LoginPage.tsx
```

### Step 3: Restart Server
```bash
stop-server.bat
start-server.bat
```

---

## 👤 Creating Your First Supabase User

Before you can login with Supabase auth, you need to create a user:

### Option 1: Via Supabase Dashboard (Easiest)

1. Open https://supabase.com/dashboard → "sales DB"
2. Click **Authentication** (left sidebar)
3. Click **Users**
4. Click **Add user** button (top right)
5. Fill in:
   - **Email**: your.email@company.com
   - **Password**: YourPassword123!
   - **Auto Confirm User**: ✅ YES (check this!)
6. Click **Create user**
7. Copy the User ID (UUID like `ed70615d-7a86-48ba-ab9e-4f60807df586`)

### Option 2: Via SQL (For Bulk Creation)

Run this SQL in Supabase SQL Editor:

```sql
-- Create auth user first (this creates the login)
-- Supabase will generate a UUID
-- You'll need to replace the UUID below with the actual one

-- After creating via dashboard, insert the profile:
INSERT INTO public.users (id, email, full_name, role, is_active)
VALUES (
  'USER_UUID_FROM_AUTH_USERS',  -- Replace with actual UUID from auth.users
  'your.email@company.com',
  'Your Full Name',
  'admin',
  true
);
```

### Recommended First Users:

Create these users to test all roles:

| Email | Role | Purpose |
|-------|------|---------|
| ceo@bisedge.com | admin | Full access, CEO approval |
| manager@bisedge.com | manager | See all quotes, approve Tier 1-3 |
| sales@bisedge.com | sales | Create quotes, see own only |

---

## 🧪 Testing New Auth

### Test 1: Local Mode (No Changes)
1. Keep `VITE_APP_MODE=local`
2. Login with: `admin` / `admin123`
3. Should work exactly as before ✅

### Test 2: Cloud Mode (New Auth)
1. Change `.env.local`: `VITE_APP_MODE=cloud`
2. Restart server
3. Login with: `ceo@bisedge.com` / `YourPassword123!`
4. Should login via Supabase ✅

### Test 3: Hybrid Mode (Best of Both)
1. Change `.env.local`: `VITE_APP_MODE=hybrid`
2. Restart server
3. Login with Supabase credentials
4. Works offline AND syncs to cloud ✅

---

## 🔑 Key Features

### JWT Session Management
- ✅ Sessions persist across browser reloads
- ✅ Tokens auto-refresh every hour
- ✅ Logout clears session everywhere

### Role-Based Access
User roles are fetched from `public.users` table:
- **admin** (CEO): Full access
- **manager**: See all quotes, approve most tiers
- **sales**: See own quotes only
- **viewer**: Read-only access

### Security Features
- ✅ JWT tokens (not stored in database)
- ✅ PKCE flow (secure auth)
- ✅ Auto-refresh (seamless experience)
- ✅ Session detection across tabs
- ✅ Password reset via email (cloud mode)

---

## ⚠️ Important Notes

### Migrating Existing Users

Your current local users (in IndexedDB) **cannot** be automatically migrated to Supabase because:
- Passwords are hashed differently (bcrypt vs Supabase)
- Users must be recreated in Supabase

**Solution:**
1. Create users manually in Supabase (via dashboard)
2. Send welcome emails with temp passwords
3. Users reset password on first login

### Backward Compatibility

The new auth store supports **both** modes:
- Local mode: Works exactly as before (username + bcrypt)
- Cloud mode: Uses Supabase (email + JWT)
- Hybrid mode: Uses Supabase auth + local cache

### Testing Strategy

**Recommended approach:**
1. Keep in local mode initially
2. Create test users in Supabase
3. Switch to cloud mode
4. Test login with Supabase users
5. Verify role-based access works
6. Then switch to hybrid mode for production

---

## 🐛 Troubleshooting

### "User not found in users table"
**Fix:** After creating auth user in Supabase dashboard, you must also insert into `public.users` table:

```sql
INSERT INTO public.users (id, email, full_name, role, is_active)
VALUES (
  'UUID_FROM_AUTH_DASHBOARD',
  'email@company.com',
  'Full Name',
  'admin',
  true
);
```

### "Invalid email or password" (but you know it's correct)
**Fix:** In Supabase dashboard → Authentication → Users, check:
- User exists
- Email is confirmed (green checkmark)
- User is not disabled

### "Token expired" or "Session invalid"
**Fix:** The auth store auto-refreshes, but you can manually logout and login again.

---

## 📋 Migration Checklist

Before switching to new auth:

- [ ] Create admin user in Supabase (email + password)
- [ ] Insert user profile in `public.users` table with role='admin'
- [ ] Test login in cloud mode
- [ ] Verify you can access the app
- [ ] Backup old auth files (already done with .v2 naming)
- [ ] Replace old auth with new auth (rename files)
- [ ] Restart server
- [ ] Test login works

---

## 🎯 Next Steps

You can either:

### Option A: Activate New Auth Now
1. Create admin user in Supabase
2. Replace old auth files with new versions
3. Test cloud mode authentication
4. Proceed to Phase 4

### Option B: Keep Testing Later
1. Leave auth as-is (still works)
2. Continue to Phase 4 (multi-user features)
3. Test auth migration later

---

## 🔜 After Phase 3

Once auth is migrated, we can implement:

**Phase 4: Multi-User Features**
- Quote ownership (createdBy, assignedTo)
- Role-based filtering
- Quote locking

These features **require** Supabase auth to work properly (need user IDs).

---

Ready to activate the new auth? Let me know! 🚀
