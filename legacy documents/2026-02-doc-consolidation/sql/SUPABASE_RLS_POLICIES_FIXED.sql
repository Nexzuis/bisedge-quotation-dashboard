-- ==============================================================================
-- BISEDGE QUOTATION DASHBOARD - FIXED RLS POLICIES
-- ==============================================================================
-- This fixes the infinite recursion error by using a security definer function
-- that bypasses RLS when checking user roles.
--
-- INSTRUCTIONS:
-- 1. Open Supabase SQL Editor
-- 2. Create a New Query
-- 3. Copy and paste this ENTIRE file
-- 4. Click RUN
-- ==============================================================================

-- First, drop all existing policies to start fresh
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

DROP POLICY IF EXISTS "Users can view quote versions if they can view quote" ON public.quote_versions;
DROP POLICY IF EXISTS "System can insert quote versions" ON public.quote_versions;

DROP POLICY IF EXISTS "Users can view approval actions" ON public.approval_actions;
DROP POLICY IF EXISTS "Authenticated users can log approval actions" ON public.approval_actions;

DROP POLICY IF EXISTS "Users can view collaborators" ON public.quote_collaborators;
DROP POLICY IF EXISTS "Owner can add collaborators" ON public.quote_collaborators;

DROP POLICY IF EXISTS "Users can view presence" ON public.quote_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON public.quote_presence;
DROP POLICY IF EXISTS "Users can update own presence timestamp" ON public.quote_presence;
DROP POLICY IF EXISTS "Users can delete own presence" ON public.quote_presence;

DROP POLICY IF EXISTS "All can insert audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Admin can read audit logs" ON public.audit_log;
DROP POLICY IF EXISTS "Users can read own audit logs" ON public.audit_log;

DROP POLICY IF EXISTS "All can view approval tiers" ON public.approval_tiers;
DROP POLICY IF EXISTS "All can view commission tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "All can view residual curves" ON public.residual_curves;
DROP POLICY IF EXISTS "Admin can modify approval tiers" ON public.approval_tiers;
DROP POLICY IF EXISTS "Admin can modify commission tiers" ON public.commission_tiers;
DROP POLICY IF EXISTS "Admin can modify residual curves" ON public.residual_curves;

DROP POLICY IF EXISTS "All can view forklift models" ON public.forklift_models;
DROP POLICY IF EXISTS "All can view battery models" ON public.battery_models;
DROP POLICY IF EXISTS "All can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Admin can modify forklift models" ON public.forklift_models;
DROP POLICY IF EXISTS "Admin can modify battery models" ON public.battery_models;
DROP POLICY IF EXISTS "Admin can modify attachments" ON public.attachments;

-- Drop the old helper function if it exists
DROP FUNCTION IF EXISTS public.get_user_role();

-- ==============================================================================
-- HELPER FUNCTION: Get Current User's Role (SECURITY DEFINER)
-- ==============================================================================
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();

  RETURN user_role;
END;
$$;

COMMENT ON FUNCTION public.get_my_role IS 'Get the role of the currently authenticated user (bypasses RLS)';

-- ==============================================================================
-- USERS TABLE POLICIES (FIXED - No recursion!)
-- ==============================================================================

-- Admin sees all users
CREATE POLICY "admin_view_all_users"
  ON public.users
  FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Manager sees all users
CREATE POLICY "manager_view_all_users"
  ON public.users
  FOR SELECT
  USING (public.get_my_role() = 'manager');

-- Users can view themselves
CREATE POLICY "user_view_self"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Admin can update users
CREATE POLICY "admin_update_users"
  ON public.users
  FOR UPDATE
  USING (public.get_my_role() = 'admin');

-- Users can update their own profile
CREATE POLICY "user_update_self"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- ==============================================================================
-- CUSTOMERS TABLE POLICIES
-- ==============================================================================

-- All authenticated users can view customers (global pool)
CREATE POLICY "all_view_customers"
  ON public.customers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- All authenticated users can create customers
CREATE POLICY "all_create_customers"
  ON public.customers
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid()
  );

-- Key account managers and admins can update customers
CREATE POLICY "privileged_update_customers"
  ON public.customers
  FOR UPDATE
  USING (public.get_my_role() IN ('key-account', 'manager', 'admin'));

-- ==============================================================================
-- QUOTES TABLE POLICIES - SELECT (VIEW)
-- ==============================================================================

-- Admin sees all quotes
CREATE POLICY "admin_view_all_quotes"
  ON public.quotes
  FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Manager sees all quotes
CREATE POLICY "manager_view_all_quotes"
  ON public.quotes
  FOR SELECT
  USING (public.get_my_role() = 'manager');

-- Sales sees only their own quotes
CREATE POLICY "sales_view_own_quotes"
  ON public.quotes
  FOR SELECT
  USING (
    public.get_my_role() = 'sales' AND
    (created_by = auth.uid() OR assigned_to = auth.uid())
  );

-- Key account sees own quotes
CREATE POLICY "key_account_view_own_quotes"
  ON public.quotes
  FOR SELECT
  USING (
    public.get_my_role() = 'key-account' AND
    (created_by = auth.uid() OR assigned_to = auth.uid())
  );

-- Viewer sees approved quotes only
CREATE POLICY "viewer_view_approved_quotes"
  ON public.quotes
  FOR SELECT
  USING (
    public.get_my_role() = 'viewer' AND
    status = 'approved'
  );

-- ==============================================================================
-- QUOTES TABLE POLICIES - INSERT (CREATE)
-- ==============================================================================

-- All authenticated users can create quotes
CREATE POLICY "all_create_quotes"
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
CREATE POLICY "owner_update_draft"
  ON public.quotes
  FOR UPDATE
  USING (
    (created_by = auth.uid() OR assigned_to = auth.uid()) AND
    status = 'draft'
  );

-- Manager can update any quote
CREATE POLICY "manager_update_any"
  ON public.quotes
  FOR UPDATE
  USING (public.get_my_role() IN ('admin', 'manager'));

-- ==============================================================================
-- QUOTES TABLE POLICIES - DELETE
-- ==============================================================================

-- Admin can delete quotes
CREATE POLICY "admin_delete_quotes"
  ON public.quotes
  FOR DELETE
  USING (public.get_my_role() = 'admin');

-- Owner can delete own draft quotes
CREATE POLICY "owner_delete_draft"
  ON public.quotes
  FOR DELETE
  USING (
    created_by = auth.uid() AND
    status = 'draft'
  );

-- ==============================================================================
-- CONFIGURATION TABLES POLICIES (Read-only for all, admin can modify)
-- ==============================================================================

-- Approval Tiers
CREATE POLICY "all_view_approval_tiers"
  ON public.approval_tiers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_modify_approval_tiers"
  ON public.approval_tiers FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Commission Tiers
CREATE POLICY "all_view_commission_tiers"
  ON public.commission_tiers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_modify_commission_tiers"
  ON public.commission_tiers FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Residual Curves
CREATE POLICY "all_view_residual_curves"
  ON public.residual_curves FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_modify_residual_curves"
  ON public.residual_curves FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Forklift Models
CREATE POLICY "all_view_forklift_models"
  ON public.forklift_models FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_modify_forklift_models"
  ON public.forklift_models FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Battery Models
CREATE POLICY "all_view_battery_models"
  ON public.battery_models FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_modify_battery_models"
  ON public.battery_models FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Attachments
CREATE POLICY "all_view_attachments"
  ON public.attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_modify_attachments"
  ON public.attachments FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ==============================================================================
-- AUDIT LOG POLICIES
-- ==============================================================================

-- All can insert audit logs
CREATE POLICY "all_insert_audit"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin and manager can read all audit logs
CREATE POLICY "privileged_read_audit"
  ON public.audit_log FOR SELECT
  USING (public.get_my_role() IN ('admin', 'manager'));

-- Users can read their own audit entries
CREATE POLICY "user_read_own_audit"
  ON public.audit_log FOR SELECT
  USING (user_id = auth.uid());

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

-- Check that RLS is enabled and policies exist
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- You should see multiple policies listed for each table

COMMENT ON SCHEMA public IS 'Bisedge Quotation Dashboard - RLS Policies Fixed (No Recursion)';
