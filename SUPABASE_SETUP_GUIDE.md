# Supabase Setup Guide
## For Bisedge Quotation Dashboard - Cloud Migration

---

## Progress So Far ✅

I've completed the foundational infrastructure for your enterprise cloud transformation:

### **Completed Tasks:**

1. ✅ **Installed Supabase packages** (`@supabase/supabase-js`)
2. ✅ **Created environment configuration** (`.env.local`, `.env.example`)
3. ✅ **Created Supabase client** (`src/lib/supabase.ts`)
4. ✅ **Created database type definitions** (`src/lib/database.types.ts`)
5. ✅ **Created database abstraction layer** (`src/db/DatabaseAdapter.ts`)
6. ✅ **Implemented local adapter** (`src/db/LocalAdapter.ts` - wraps current IndexedDB)
7. ✅ **Implemented Supabase adapter** (`src/db/SupabaseAdapter.ts` - cloud backend)

### **What This Means:**

Your app now has a **dual-mode architecture** that can switch between:
- **Local mode**: Current behavior (IndexedDB, offline-only) - **DEFAULT**
- **Cloud mode**: Supabase backend (requires internet)
- **Hybrid mode**: Local cache + cloud sync (future implementation)

**Current status**: App still runs in local mode (no breaking changes). Cloud mode is ready but needs Supabase database to be set up.

---

## Next Steps: Supabase Database Setup

To activate cloud mode, we need to configure your Supabase project. Here's exactly what you need to do:

### **Step 1: Access Your Supabase Project**

1. Go to https://supabase.com/dashboard
2. Open your **"sales DB"** project
3. Keep this tab open - we'll need to copy credentials

### **Step 2: Get Your Credentials**

1. In Supabase dashboard, click **Settings** (left sidebar, bottom)
2. Click **API**
3. You'll see two important values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJhbGci...`

4. Copy these values - we'll need them in Step 4

### **Step 3: Create Database Tables**

1. In Supabase dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query** button
3. Copy the entire SQL schema from the file: `SUPABASE_SCHEMA.sql` (I'll create this next)
4. Paste it into the query editor
5. Click **RUN** (or press Ctrl+Enter)
6. You should see: "Success. No rows returned"

This creates all the tables for:
- Users
- Quotes
- Customers
- Approval tiers
- Commission tiers
- Audit logs
- etc.

### **Step 4: Enable Row-Level Security**

1. Still in SQL Editor, click **New Query** again
2. Copy the RLS policies SQL from: `SUPABASE_RLS_POLICIES.sql` (I'll create this next)
3. Paste and **RUN**
4. This enables role-based access control (Sales see own quotes, Managers see all, etc.)

### **Step 5: Configure Authentication**

1. Click **Authentication** (left sidebar)
2. Click **Providers**
3. Ensure **Email** is enabled (should be on by default)
4. Click **URL Configuration**
5. Set:
   - **Site URL**: `http://localhost:5173` (for development)
   - **Redirect URLs**: Add `http://localhost:5173/**`

### **Step 6: Update Environment Variables**

1. Open the file: `.env.local` in your project
2. Replace the placeholder values with your actual credentials:

```bash
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here

# Keep in local mode for now
VITE_APP_MODE=local
```

3. Save the file

### **Step 7: Test the Connection**

Once you've completed Steps 1-6, let me know and I'll:
- Create a simple test to verify Supabase connectivity
- Help troubleshoot if there are any issues
- Continue with the remaining implementation

---

## What's Next After Setup?

Once Supabase is configured, we'll implement:

### **Phase 2: Offline Sync** (Tasks 7-8)
- Sync queue for offline operations
- Conflict resolution when coming back online
- Background sync when internet returns

### **Phase 3: Authentication** (Task 9)
- Migrate from local bcrypt to Supabase Auth
- JWT sessions with auto-refresh
- Role-based claims

### **Phase 4: Multi-User Features** (Tasks 10-12)
- Quote ownership tracking
- Role-based filtering (Sales see own, Manager sees all)
- Quote locking (prevent concurrent edits)

### **Phase 5: Approval Workflow** (Tasks 13-14)
- Wire approval to real users
- Approval dashboard for pending quotes
- Real-time routing to correct approvers

### **Phase 6: Real-Time** (Tasks 15-17)
- Live presence (see who's viewing)
- Auto-refresh when others edit
- Instant approval notifications

### **Phase 7: Migration** (Task 18)
- Export local IndexedDB data
- Import to Supabase cloud
- Validate migration success

---

## Frequently Asked Questions

### Q: Will this break my current app?
**A:** No! The app is currently set to `VITE_APP_MODE=local`, so it still uses IndexedDB exactly as before. Cloud mode only activates when you change this setting.

### Q: What if I don't have internet?
**A:** In local mode (default), everything works offline. In hybrid mode (future), you can work offline and sync later. Cloud-only mode requires internet.

### Q: Can I switch back to local mode?
**A:** Yes! Just change `VITE_APP_MODE=local` in `.env.local` and restart the dev server. Your IndexedDB data is preserved.

### Q: What about my existing quotes?
**A:** All your existing local quotes remain in IndexedDB. Later we'll create a migration tool to copy them to Supabase.

### Q: Is this secure?
**A:** Yes! Row-Level Security (RLS) ensures:
- Sales reps only see their own quotes
- Managers see all quotes
- Users can't access data they don't own
- All database queries are validated server-side

### Q: What's my Supabase project region?
**A:** From your plan notes, you mentioned Europe (Frankfurt/London). This means ~150-200ms latency to South Africa, which is acceptable for background sync.

---

## Current App Structure

```
src/
├── lib/
│   ├── supabase.ts           ✅ NEW - Supabase client
│   └── database.types.ts     ✅ NEW - TypeScript types
├── db/
│   ├── DatabaseAdapter.ts    ✅ NEW - Abstraction layer
│   ├── LocalAdapter.ts       ✅ NEW - IndexedDB wrapper
│   ├── SupabaseAdapter.ts    ✅ NEW - Cloud backend
│   ├── IndexedDBRepository.ts    (existing)
│   └── schema.ts                  (existing)
├── store/
│   ├── useQuoteStore.ts      (existing - will enhance)
│   └── useAuthStore.ts       (existing - will migrate to Supabase)
└── components/
    └── (all existing components work unchanged)
```

---

## Ready to Proceed?

Once you've completed the Supabase setup (Steps 1-6 above), let me know and I'll:

1. Create the SQL schema file for you to run
2. Create the RLS policies file
3. Test the Supabase connection
4. Continue with the remaining implementation phases

You can also tell me:
- If you encounter any errors during setup
- If you need help with any specific step
- When you're ready to switch to cloud/hybrid mode
- If you want to test the dual-mode architecture

---

## Contact & Support

If you get stuck:
1. Check the Supabase dashboard → Logs for error messages
2. Check browser console for connection errors
3. Verify your `.env.local` has the correct credentials
4. Make sure your Supabase project is in the correct region (Europe)

I'm here to help at every step! 🚀
