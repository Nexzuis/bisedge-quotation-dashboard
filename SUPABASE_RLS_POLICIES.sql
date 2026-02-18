-- ==============================================================================
-- BISEDGE QUOTATION DASHBOARD - ROW-LEVEL SECURITY POLICIES
-- ==============================================================================
-- This script enables Row-Level Security (RLS) and defines access policies
-- for role-based permissions.
--
-- ROLE HIERARCHY:
-- - admin (CEO): Full access to everything
-- - manager: See all quotes, approve tiers 1-3, manage team
-- - key-account: See assigned customer quotes
-- - sales: See own quotes only, create/edit drafts
-- - viewer: Read-only access to approved quotes
--
-- INSTRUCTIONS:
-- 1. Run SUPABASE_SCHEMA.sql FIRST (if you haven't already)
-- 2. Open SQL Editor in Supabase dashboard
-- 3. Create a New Query
-- 4. Copy and paste this ENTIRE file
-- 5. Click "RUN"
-- 6. You should see: "Success. No rows returned"
-- ==============================================================================

-- ==============================================================================
-- ENABLE ROW-LEVEL SECURITY ON ALL TABLES
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residual_curves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forklift_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battery_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- HELPER FUNCTION: Get Current User's Role
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_role IS 'Get the role of the currently authenticated user';

-- ==============================================================================
-- USERS TABLE POLICIES
-- ==============================================================================

-- Admin sees all users
CREATE POLICY "Admin can view all users"
  ON public.users
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Manager sees all users
CREATE POLICY "Manager can view all users"
  ON public.users
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'
  );

-- Users can view themselves
CREATE POLICY "Users can view self"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Admin can update users
CREATE POLICY "Admin can update users"
  ON public.users
  FOR UPDATE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- ==============================================================================
-- CUSTOMERS TABLE POLICIES
-- ==============================================================================

-- All authenticated users can view customers (global pool)
CREATE POLICY "All can view customers"
  ON public.customers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can create customers
CREATE POLICY "All can create customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Key account managers and admins can update customers
CREATE POLICY "Key account can update customers"
  ON public.customers
  FOR UPDATE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('key-account', 'manager', 'admin')
  );

-- ==============================================================================
-- QUOTES TABLE POLICIES - SELECT (VIEW)
-- ==============================================================================

-- Admin (CEO) sees all quotes
CREATE POLICY "Admin sees all quotes"
  ON public.quotes
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Manager sees all quotes
CREATE POLICY "Manager sees all quotes"
  ON public.quotes
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'
  );

-- Sales sees only their own quotes
CREATE POLICY "Sales sees own quotes"
  ON public.quotes
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    assigned_to = auth.uid()
  );

-- Key account sees quotes for assigned customers (future feature)
CREATE POLICY "Key account sees assigned customer quotes"
  ON public.quotes
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'key-account' AND
    (created_by = auth.uid() OR assigned_to = auth.uid())
  );

-- Viewer sees approved quotes only
CREATE POLICY "Viewer sees approved quotes"
  ON public.quotes
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'viewer' AND
    status = 'approved'
  );

-- ==============================================================================
-- QUOTES TABLE POLICIES - INSERT (CREATE)
-- ==============================================================================

-- All authenticated users can create quotes
CREATE POLICY "All can create quotes"
  ON public.quotes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- ==============================================================================
-- QUOTES TABLE POLICIES - UPDATE (EDIT)
-- ==============================================================================

-- Owner can update own draft quotes
CREATE POLICY "Owner can update own draft"
  ON public.quotes
  FOR UPDATE
  USING (
    (created_by = auth.uid() OR assigned_to = auth.uid()) AND
    status = 'draft'
  );

-- Manager can update any quote
CREATE POLICY "Manager can update any quote"
  ON public.quotes
  FOR UPDATE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Admin can update any quote
CREATE POLICY "Admin can update any quote"
  ON public.quotes
  FOR UPDATE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- ==============================================================================
-- QUOTES TABLE POLICIES - DELETE
-- ==============================================================================

-- Only admin can delete quotes
CREATE POLICY "Admin can delete quotes"
  ON public.quotes
  FOR DELETE
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- Owner can delete own draft quotes
CREATE POLICY "Owner can delete own draft"
  ON public.quotes
  FOR DELETE
  USING (
    created_by = auth.uid() AND
    status = 'draft'
  );

-- ==============================================================================
-- QUOTE VERSIONS TABLE POLICIES
-- ==============================================================================

-- Anyone who can see the parent quote can see its versions
CREATE POLICY "Users can view quote versions if they can view quote"
  ON public.quote_versions
  FOR SELECT
  USING (
    quote_id IN (SELECT id FROM public.quotes)
  );

-- System can insert versions (via triggers)
CREATE POLICY "System can insert quote versions"
  ON public.quote_versions
  FOR INSERT
  WITH CHECK (true);

-- ==============================================================================
-- APPROVAL ACTIONS TABLE POLICIES
-- ==============================================================================

-- Anyone who can see the quote can see approval actions
CREATE POLICY "Users can view approval actions"
  ON public.approval_actions
  FOR SELECT
  USING (
    quote_id IN (SELECT id FROM public.quotes)
  );

-- Authenticated users can insert approval actions
CREATE POLICY "Authenticated users can log approval actions"
  ON public.approval_actions
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    performed_by = auth.uid()
  );

-- ==============================================================================
-- QUOTE COLLABORATORS TABLE POLICIES
-- ==============================================================================

-- Users can see collaborators on quotes they have access to
CREATE POLICY "Users can view collaborators"
  ON public.quote_collaborators
  FOR SELECT
  USING (
    quote_id IN (SELECT id FROM public.quotes)
  );

-- Quote owner can add collaborators
CREATE POLICY "Owner can add collaborators"
  ON public.quote_collaborators
  FOR INSERT
  WITH CHECK (
    quote_id IN (
      SELECT id FROM public.quotes
      WHERE created_by = auth.uid()
    )
  );

-- ==============================================================================
-- QUOTE PRESENCE TABLE POLICIES
-- ==============================================================================

-- Users can see presence on quotes they can view
CREATE POLICY "Users can view presence"
  ON public.quote_presence
  FOR SELECT
  USING (
    quote_id IN (SELECT id FROM public.quotes)
  );

-- Users can update their own presence
CREATE POLICY "Users can update own presence"
  ON public.quote_presence
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    quote_id IN (SELECT id FROM public.quotes)
  );

CREATE POLICY "Users can update own presence timestamp"
  ON public.quote_presence
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own presence
CREATE POLICY "Users can delete own presence"
  ON public.quote_presence
  FOR DELETE
  USING (user_id = auth.uid());

-- ==============================================================================
-- AUDIT LOG TABLE POLICIES
-- ==============================================================================

-- All authenticated users can insert audit entries
CREATE POLICY "All can insert audit logs"
  ON public.audit_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin and manager can read audit logs
CREATE POLICY "Admin can read audit logs"
  ON public.audit_log
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Users can read their own audit entries
CREATE POLICY "Users can read own audit logs"
  ON public.audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- ==============================================================================
-- CONFIGURATION TABLES POLICIES
-- ==============================================================================

-- All authenticated users can read configuration tables
CREATE POLICY "All can view approval tiers"
  ON public.approval_tiers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All can view commission tiers"
  ON public.commission_tiers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All can view residual curves"
  ON public.residual_curves FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admin can modify configuration
CREATE POLICY "Admin can modify approval tiers"
  ON public.approval_tiers FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin can modify commission tiers"
  ON public.commission_tiers FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin can modify residual curves"
  ON public.residual_curves FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- ==============================================================================
-- CATALOG TABLES POLICIES
-- ==============================================================================

-- All authenticated users can read catalog tables
CREATE POLICY "All can view forklift models"
  ON public.forklift_models FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All can view battery models"
  ON public.battery_models FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "All can view attachments"
  ON public.attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admin can modify catalog
CREATE POLICY "Admin can modify forklift models"
  ON public.forklift_models FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin can modify battery models"
  ON public.battery_models FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admin can modify attachments"
  ON public.attachments FOR ALL
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================
-- Check that RLS is enabled on all tables
-- ==============================================================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- You should see "rowsecurity = true" for all tables

-- ==============================================================================
-- TEST POLICIES (Optional - run these in a separate query)
-- ==============================================================================
-- Uncomment and run these queries to test RLS policies:
--
-- -- Test as sales rep (should only see own quotes)
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "sales-user-id", "role": "sales"}';
-- SELECT * FROM public.quotes;
--
-- -- Test as manager (should see all quotes)
-- SET LOCAL request.jwt.claims TO '{"sub": "manager-user-id", "role": "manager"}';
-- SELECT * FROM public.quotes;
--
-- -- Test as admin (should see all quotes)
-- SET LOCAL request.jwt.claims TO '{"sub": "admin-user-id", "role": "admin"}';
-- SELECT * FROM public.quotes;
-- ==============================================================================

COMMENT ON SCHEMA public IS 'Bisedge Quotation Dashboard - RLS Policies Enabled';
