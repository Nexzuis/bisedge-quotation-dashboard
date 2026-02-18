-- ==============================================================================
-- TEMPORARY: DISABLE RLS FOR TESTING
-- ==============================================================================
-- This temporarily disables RLS so we can test the connection.
-- We'll properly configure RLS with authentication in Phase 3.
--
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor
-- 2. New Query
-- 3. Copy/paste this entire file
-- 4. Click RUN
-- ==============================================================================

-- Disable RLS on all tables temporarily
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_presence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_tiers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.residual_curves DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.forklift_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.battery_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "admin_view_all_users" ON public.users;
DROP POLICY IF EXISTS "manager_view_all_users" ON public.users;
DROP POLICY IF EXISTS "user_view_self" ON public.users;
DROP POLICY IF EXISTS "admin_update_users" ON public.users;
DROP POLICY IF EXISTS "user_update_self" ON public.users;

DROP POLICY IF EXISTS "all_view_customers" ON public.customers;
DROP POLICY IF EXISTS "all_create_customers" ON public.customers;
DROP POLICY IF EXISTS "privileged_update_customers" ON public.customers;

DROP POLICY IF EXISTS "admin_view_all_quotes" ON public.quotes;
DROP POLICY IF EXISTS "manager_view_all_quotes" ON public.quotes;
DROP POLICY IF EXISTS "sales_view_own_quotes" ON public.quotes;
DROP POLICY IF EXISTS "key_account_view_own_quotes" ON public.quotes;
DROP POLICY IF EXISTS "viewer_view_approved_quotes" ON public.quotes;
DROP POLICY IF EXISTS "all_create_quotes" ON public.quotes;
DROP POLICY IF EXISTS "owner_update_draft" ON public.quotes;
DROP POLICY IF EXISTS "manager_update_any" ON public.quotes;
DROP POLICY IF EXISTS "admin_delete_quotes" ON public.quotes;
DROP POLICY IF EXISTS "owner_delete_draft" ON public.quotes;

-- Drop any old policies that might still exist
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Manager can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view self" ON public.users;
DROP POLICY IF EXISTS "Admin can update users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "All can view customers" ON public.customers;
DROP POLICY IF EXISTS "All can create customers" ON public.customers;
DROP POLICY IF EXISTS "Key account can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admin sees all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Manager sees all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Sales sees own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Key account sees assigned customer quotes" ON public.quotes;
DROP POLICY IF EXISTS "Viewer sees approved quotes" ON public.quotes;
DROP POLICY IF EXISTS "All can create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Owner can update own draft" ON public.quotes;
DROP POLICY IF EXISTS "Manager can update any quote" ON public.quotes;
DROP POLICY IF EXISTS "Admin can update any quote" ON public.quotes;
DROP POLICY IF EXISTS "Admin can delete quotes" ON public.quotes;
DROP POLICY IF EXISTS "Owner can delete own draft" ON public.quotes;

-- Drop helper functions
DROP FUNCTION IF EXISTS public.get_my_role();
DROP FUNCTION IF EXISTS public.get_user_role();

-- Verify RLS is disabled
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity = true THEN 'ENABLED ⚠️'
    ELSE 'DISABLED ✅'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

COMMENT ON SCHEMA public IS 'Bisedge - RLS Temporarily Disabled for Testing';
