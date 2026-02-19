-- ============================================================================== 
-- BISEDGE SUPABASE MASTER CURRENT STATE SCRIPT
-- ============================================================================== 
-- Built on: 2026-02-19
-- Purpose: Single canonical SQL reference representing the current Supabase state
-- Source chain preserved from legacy root SQL files.
-- ============================================================================== 

-- ============================================================================== 
-- BEGIN SOURCE: SUPABASE_SCHEMA.sql
-- ============================================================================== 
-- ==============================================================================
-- BISEDGE QUOTATION DASHBOARD - SUPABASE SCHEMA
-- ==============================================================================
-- This script creates all database tables, indexes, and triggers for the
-- multi-user cloud architecture.
--
-- INSTRUCTIONS:
-- 1. Open your Supabase project: https://supabase.com/dashboard
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this ENTIRE file
-- 5. Click "RUN" (or press Ctrl+Enter)
-- 6. You should see: "Success. No rows returned"
--
-- If you see errors, check:
-- - You're connected to the correct project ("sales DB")
-- - You have admin permissions
-- - The script hasn't been run before (check Tables in left sidebar)
-- ==============================================================================

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- USERS TABLE
-- ==============================================================================
-- Extends Supabase auth.users with application-specific fields
-- RLS will control who can see which users
-- ==============================================================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'key-account', 'sales', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Additional metadata
  phone TEXT,
  department TEXT,
  employee_id TEXT,

  -- Delegation for approval authority transfer
  delegate_to UUID REFERENCES public.users(id),
  delegate_until TIMESTAMPTZ
);

COMMENT ON TABLE public.users IS 'Application users with roles and permissions';
COMMENT ON COLUMN public.users.role IS 'User role: admin, manager, key-account, sales, viewer';
COMMENT ON COLUMN public.users.delegate_to IS 'User ID to delegate approval authority to';
COMMENT ON COLUMN public.users.delegate_until IS 'Delegation expiry date';

-- ==============================================================================
-- CUSTOMERS TABLE
-- ==============================================================================
-- Global customer pool accessible to all sales reps
-- ==============================================================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address JSONB,  -- { street, city, province, postal, country }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.customers IS 'Global customer pool';
COMMENT ON COLUMN public.customers.address IS 'JSON object with street, city, province, postal, country';

-- ==============================================================================
-- QUOTES TABLE
-- ==============================================================================
-- Main quotes table with ownership, approval workflow, and locking
-- ==============================================================================

CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_ref TEXT UNIQUE NOT NULL,  -- "2140.0", "2141.0", etc.
  version INTEGER DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('draft', 'pending-approval', 'approved', 'sent-to-customer', 'rejected', 'expired')),

  -- Ownership & Access
  created_by UUID NOT NULL REFERENCES public.users(id),
  assigned_to UUID REFERENCES public.users(id),  -- NULL = creator owns

  -- Customer Info
  customer_id UUID REFERENCES public.customers(id),
  client_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  client_address JSONB,

  -- Pricing Configuration
  factory_roe NUMERIC(10,2) NOT NULL,
  customer_roe NUMERIC(10,2) NOT NULL,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  annual_interest_rate NUMERIC(5,2) NOT NULL,

  -- Terms
  default_lease_term_months INTEGER,
  battery_chemistry_lock TEXT CHECK (battery_chemistry_lock IN ('lead-acid', 'lithium-ion')),
  quote_type TEXT CHECK (quote_type IN ('rental', 'rent-to-own', 'dual')),

  -- Fleet Configuration (JSONB for 6 slots)
  slots JSONB NOT NULL,  -- Array of UnitSlot objects

  -- Approval Workflow
  approval_tier INTEGER CHECK (approval_tier BETWEEN 1 AND 4),
  approval_status TEXT,
  approval_notes TEXT,
  override_irr BOOLEAN DEFAULT false,
  submitted_by UUID REFERENCES public.users(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Locking for concurrent edits
  locked_by UUID REFERENCES public.users(id),
  locked_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  quote_date TIMESTAMPTZ DEFAULT NOW(),

  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'conflict'))
);

COMMENT ON TABLE public.quotes IS 'Quotes with multi-user ownership and approval workflow';
COMMENT ON COLUMN public.quotes.created_by IS 'User who created this quote';
COMMENT ON COLUMN public.quotes.assigned_to IS 'User assigned to this quote (NULL = creator)';
COMMENT ON COLUMN public.quotes.locked_by IS 'User currently editing this quote';
COMMENT ON COLUMN public.quotes.slots IS 'JSON array of 6 UnitSlot objects';

-- ==============================================================================
-- QUOTE VERSIONS TABLE
-- ==============================================================================
-- Immutable history of quote changes
-- ==============================================================================

CREATE TABLE public.quote_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,  -- Full quote state at this version
  changed_by UUID REFERENCES public.users(id),
  change_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(quote_id, version)
);

COMMENT ON TABLE public.quote_versions IS 'Immutable version history of quotes';
COMMENT ON COLUMN public.quote_versions.snapshot IS 'Full JSON snapshot of quote at this version';

-- ==============================================================================
-- APPROVAL ACTIONS TABLE
-- ==============================================================================
-- Audit trail of all approval-related actions
-- ==============================================================================

CREATE TABLE public.approval_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'delegated', 'recalled')),
  performed_by UUID NOT NULL REFERENCES public.users(id),
  tier INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.approval_actions IS 'Audit trail of approval workflow actions';

-- ==============================================================================
-- QUOTE COLLABORATORS TABLE
-- ==============================================================================
-- Share quotes beyond owner (future feature)
-- ==============================================================================

CREATE TABLE public.quote_collaborators (
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  permission TEXT CHECK (permission IN ('view', 'edit', 'approve')),
  granted_by UUID REFERENCES public.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (quote_id, user_id)
);

COMMENT ON TABLE public.quote_collaborators IS 'Shared access to quotes beyond owner';

-- ==============================================================================
-- QUOTE PRESENCE TABLE
-- ==============================================================================
-- Track who is currently viewing each quote (real-time)
-- ==============================================================================

CREATE TABLE public.quote_presence (
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (quote_id, user_id)
);

COMMENT ON TABLE public.quote_presence IS 'Real-time presence tracking for quotes';

-- ==============================================================================
-- AUDIT LOG TABLE
-- ==============================================================================
-- Comprehensive change tracking for compliance
-- ==============================================================================

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT
);

COMMENT ON TABLE public.audit_log IS 'Comprehensive audit trail for compliance';

-- ==============================================================================
-- CONFIGURATION TABLES
-- ==============================================================================
-- Approval tiers, commission tiers, residual curves
-- ==============================================================================

CREATE TABLE public.approval_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_level INTEGER UNIQUE NOT NULL,
  tier_name TEXT NOT NULL,
  min_value NUMERIC(15,2) NOT NULL,
  max_value NUMERIC(15,2) NOT NULL,
  approver_role TEXT,  -- 'manager', 'admin', etc.
  description TEXT
);

COMMENT ON TABLE public.approval_tiers IS 'Approval tier configuration by deal value';

CREATE TABLE public.commission_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  min_margin NUMERIC(5,2) NOT NULL,
  max_margin NUMERIC(5,2) NOT NULL,
  commission_pct NUMERIC(5,2) NOT NULL
);

COMMENT ON TABLE public.commission_tiers IS 'Commission rates by margin percentage';

CREATE TABLE public.residual_curves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chemistry TEXT NOT NULL CHECK (chemistry IN ('lead-acid', 'lithium-ion')),
  term_36 NUMERIC(5,2),
  term_48 NUMERIC(5,2),
  term_60 NUMERIC(5,2),
  term_72 NUMERIC(5,2),
  term_84 NUMERIC(5,2)
);

COMMENT ON TABLE public.residual_curves IS 'Residual value curves by battery chemistry';

-- ==============================================================================
-- CATALOG TABLES
-- ==============================================================================
-- Forklift models, batteries, attachments
-- ==============================================================================

CREATE TABLE public.forklift_models (
  model_code TEXT PRIMARY KEY,
  model_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  capacity NUMERIC(10,2),
  eur_cost NUMERIC(10,2) NOT NULL,
  default_mast TEXT,
  available_masts TEXT[],
  compatible_batteries TEXT[],
  dimensions JSONB,  -- { length, width, height, weight }
  specifications JSONB,
  image_url TEXT
);

COMMENT ON TABLE public.forklift_models IS 'Forklift model catalog';

CREATE TABLE public.battery_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  chemistry TEXT NOT NULL,
  voltage NUMERIC(5,1),
  capacity NUMERIC(8,2),
  eur_cost NUMERIC(10,2) NOT NULL,
  weight NUMERIC(8,2),
  dimensions JSONB,
  compatible_models TEXT[],
  warranty_years INTEGER
);

COMMENT ON TABLE public.battery_models IS 'Battery model catalog';

CREATE TABLE public.attachments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  eur_cost NUMERIC(10,2) NOT NULL,
  description TEXT,
  compatible_models TEXT[],
  image_url TEXT
);

COMMENT ON TABLE public.attachments IS 'Attachment catalog';

-- ==============================================================================
-- INDEXES FOR PERFORMANCE
-- ==============================================================================
-- Critical indexes for fast queries
-- ==============================================================================

-- Quotes indexes
CREATE INDEX idx_quotes_created_by ON public.quotes(created_by);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_approval_status ON public.quotes(approval_status);
CREATE INDEX idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX idx_quotes_quote_ref ON public.quotes(quote_ref);

-- Audit log indexes
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, timestamp DESC);
CREATE INDEX idx_audit_log_timestamp ON public.audit_log(timestamp DESC);

-- Approval actions indexes
CREATE INDEX idx_approval_actions_quote ON public.approval_actions(quote_id);
CREATE INDEX idx_approval_actions_user ON public.approval_actions(performed_by);

-- Customers indexes
CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_customers_created_by ON public.customers(created_by);

-- Users indexes
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- ==============================================================================
-- TRIGGERS
-- ==============================================================================
-- Automatic timestamp updates
-- ==============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger on users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger on quotes table
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger on customers table
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- SEED DATA
-- ==============================================================================
-- Default configuration values
-- ==============================================================================

-- Approval Tiers (based on total contract value in ZAR)
INSERT INTO public.approval_tiers (tier_level, tier_name, min_value, max_value, approver_role, description) VALUES
(1, 'Sales Manager', 0, 500000, 'manager', 'Deals up to R500k'),
(2, 'Regional Director', 500001, 2000000, 'manager', 'Deals R500k - R2M'),
(3, 'VP Sales', 2000001, 5000000, 'manager', 'Deals R2M - R5M'),
(4, 'CEO Approval', 5000001, 999999999, 'admin', 'Deals over R5M');

-- Commission Tiers (based on margin percentage)
INSERT INTO public.commission_tiers (min_margin, max_margin, commission_pct) VALUES
(0, 10, 1.0),
(10, 15, 1.5),
(15, 20, 2.0),
(20, 25, 2.5),
(25, 100, 3.0);

-- Residual Curves (percentages by chemistry and term)
INSERT INTO public.residual_curves (chemistry, term_36, term_48, term_60, term_72, term_84) VALUES
('lead-acid', 20, 18, 15, 12, 10),
('lithium-ion', 30, 28, 25, 22, 20);

-- ==============================================================================
-- COMPLETION
-- ==============================================================================
-- If you see "Success. No rows returned", the schema is created successfully!
-- Next step: Run the RLS policies from SUPABASE_RLS_POLICIES.sql
-- ==============================================================================

-- Verify table creation
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

COMMENT ON SCHEMA public IS 'Bisedge Quotation Dashboard - Schema Version 1.0';
-- ============================================================================== 
-- END SOURCE: SUPABASE_SCHEMA.sql
-- ============================================================================== 

-- ============================================================================== 
-- BEGIN SOURCE: SUPABASE_DISABLE_RLS_TEMP.sql
-- ============================================================================== 
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
    WHEN rowsecurity = true THEN 'ENABLED âš ï¸'
    ELSE 'DISABLED âœ…'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

COMMENT ON SCHEMA public IS 'Bisedge - RLS Temporarily Disabled for Testing';
-- ============================================================================== 
-- END SOURCE: SUPABASE_DISABLE_RLS_TEMP.sql
-- ============================================================================== 

-- ============================================================================== 
-- BEGIN SOURCE: SUPABASE_SCHEMA_V2.sql
-- ============================================================================== 
-- ==============================================================================
-- BISEDGE QUOTATION DASHBOARD - SUPABASE SCHEMA V2
-- ==============================================================================
-- Migration to add CRM, notifications, templates, price lists, and config
-- tables. Also updates user roles to the new 6-role system.
--
-- PREREQUISITES: SUPABASE_SCHEMA.sql must be run first (V1 tables exist).
--
-- INSTRUCTIONS:
-- 1. Open your Supabase project SQL Editor
-- 2. Paste and run this ENTIRE file
-- 3. Verify "Success. No rows returned"
-- ==============================================================================

-- Enable UUID extension (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- STEP 1: UPDATE USER ROLES
-- ==============================================================================
-- Migrate from old roles (admin, manager, key-account, sales, viewer)
-- to new roles (system_admin, ceo, local_leader, sales_manager, key_account, sales_rep)
-- ==============================================================================

-- Drop old constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with 6 roles
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('system_admin', 'ceo', 'local_leader', 'sales_manager', 'key_account', 'sales_rep'));

-- Add permission_overrides column if not exists
DO $$ BEGIN
  ALTER TABLE public.users ADD COLUMN permission_overrides JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Migrate existing user roles
UPDATE public.users SET role = 'system_admin' WHERE role = 'admin';
UPDATE public.users SET role = 'sales_manager' WHERE role = 'manager';
UPDATE public.users SET role = 'key_account' WHERE role = 'key-account';
UPDATE public.users SET role = 'sales_rep' WHERE role = 'sales';
UPDATE public.users SET role = 'sales_rep', is_active = false WHERE role = 'viewer';

-- ==============================================================================
-- STEP 2: COMPANIES TABLE (CRM)
-- ==============================================================================
-- The main CRM entity, replacing the flat customers table for pipeline mgmt
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  trading_name TEXT DEFAULT '',
  registration_number TEXT DEFAULT '',
  vat_number TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  website TEXT DEFAULT '',
  address JSONB DEFAULT '[]',
  city TEXT DEFAULT '',
  province TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  country TEXT DEFAULT 'South Africa',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  pipeline_stage TEXT NOT NULL DEFAULT 'lead'
    CHECK (pipeline_stage IN ('lead','contacted','site-assessment','quoted','negotiation','won','lost')),
  assigned_to UUID REFERENCES public.users(id),
  estimated_value NUMERIC(15,2) DEFAULT 0,
  credit_limit NUMERIC(15,2) DEFAULT 0,
  payment_terms INTEGER DEFAULT 30,
  tags JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.companies IS 'CRM company entities with pipeline tracking';

-- ==============================================================================
-- STEP 3: CONTACTS TABLE (CRM)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT DEFAULT '',
  title TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.contacts IS 'Contact persons at CRM companies';

-- ==============================================================================
-- STEP 4: ACTIVITIES TABLE (CRM)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('note','call','email','meeting','site-visit','quote-created','quote-sent','stage-change')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.activities IS 'CRM activity timeline entries';

-- ==============================================================================
-- STEP 5: NOTIFICATIONS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('approval_needed','approval_result','quote_assigned','company_assigned','stage_change','activity_mention','system')),
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  entity_type TEXT CHECK (entity_type IN ('quote','company','activity')),
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'In-app user notifications';

-- ==============================================================================
-- STEP 6: TEMPLATES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('terms-and-conditions','email','quote-header','cover-letter')),
  name TEXT NOT NULL,
  content JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.templates IS 'Document templates for quotes and communications';

-- ==============================================================================
-- STEP 7: SETTINGS TABLE (Key-Value Store)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

COMMENT ON TABLE public.settings IS 'Application configuration key-value store';

-- ==============================================================================
-- STEP 8: PRICE LIST SERIES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.price_list_series (
  series_code TEXT PRIMARY KEY,
  series_name TEXT NOT NULL,
  models JSONB DEFAULT '[]',
  options JSONB DEFAULT '[]'
);

COMMENT ON TABLE public.price_list_series IS 'Fleet builder price list series with models and options';

-- ==============================================================================
-- STEP 9: TELEMATICS PACKAGES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.telematics_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT DEFAULT '',
  cost_zar NUMERIC(10,2) DEFAULT 0
);

COMMENT ON TABLE public.telematics_packages IS 'Telematics package options with pricing';

-- ==============================================================================
-- STEP 10: CONTAINER MAPPINGS TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.container_mappings (
  id SERIAL PRIMARY KEY,
  series_code TEXT NOT NULL,
  category TEXT DEFAULT '',
  model TEXT DEFAULT '',
  qty_per_container INTEGER DEFAULT 0,
  container_type TEXT DEFAULT '',
  container_cost_eur NUMERIC(10,2) DEFAULT 0,
  notes TEXT DEFAULT ''
);

COMMENT ON TABLE public.container_mappings IS 'Shipping container configuration per model';

-- ==============================================================================
-- STEP 11: CONFIGURATION MATRICES TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.configuration_matrices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_model_family TEXT NOT NULL,
  variants JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.configuration_matrices IS 'Forklift specification configuration matrices';

-- ==============================================================================
-- STEP 12: INDEXES FOR NEW TABLES
-- ==============================================================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_pipeline_stage ON public.companies(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_companies_assigned_to ON public.companies(assigned_to);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON public.companies(created_at DESC);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON public.contacts(company_id, is_primary);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_company_id ON public.activities(company_id);
CREATE INDEX IF NOT EXISTS idx_activities_contact_id ON public.activities(contact_id);
CREATE INDEX IF NOT EXISTS idx_activities_quote_id ON public.activities(quote_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON public.activities(created_by);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_type ON public.templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_is_default ON public.templates(type, is_default);

-- Container mappings indexes
CREATE INDEX IF NOT EXISTS idx_container_mappings_series ON public.container_mappings(series_code);

-- Configuration matrices indexes
CREATE INDEX IF NOT EXISTS idx_config_matrices_family ON public.configuration_matrices(base_model_family);

-- ==============================================================================
-- STEP 13: TRIGGERS FOR updated_at
-- ==============================================================================

-- Companies trigger
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Contacts trigger
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Templates trigger
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Configuration matrices trigger
CREATE TRIGGER update_config_matrices_updated_at
  BEFORE UPDATE ON public.configuration_matrices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- STEP 14: ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telematics_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration_matrices ENABLE ROW LEVEL SECURITY;

-- â”€â”€â”€ Companies: All authenticated users can read; assigned users + admins can write â”€â”€â”€
CREATE POLICY "companies_select" ON public.companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "companies_insert" ON public.companies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "companies_update" ON public.companies
  FOR UPDATE TO authenticated USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('system_admin', 'ceo', 'local_leader', 'sales_manager')
    )
  );

CREATE POLICY "companies_delete" ON public.companies
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('system_admin', 'ceo')
    )
  );

-- â”€â”€â”€ Contacts: Same as parent company â”€â”€â”€
CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated USING (true);

-- â”€â”€â”€ Activities: All can read, creator + admins can modify â”€â”€â”€
CREATE POLICY "activities_select" ON public.activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "activities_insert" ON public.activities
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "activities_delete" ON public.activities
  FOR DELETE TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('system_admin', 'ceo')
    )
  );

-- â”€â”€â”€ Notifications: User can only see their own â”€â”€â”€
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- â”€â”€â”€ Templates: All can read, admins can write â”€â”€â”€
CREATE POLICY "templates_select" ON public.templates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "templates_insert" ON public.templates
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('system_admin', 'ceo', 'sales_manager')
    )
  );

CREATE POLICY "templates_update" ON public.templates
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('system_admin', 'ceo', 'sales_manager')
    )
  );

CREATE POLICY "templates_delete" ON public.templates
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('system_admin', 'ceo')
    )
  );

-- â”€â”€â”€ Settings: All can read, admins can write â”€â”€â”€
CREATE POLICY "settings_select" ON public.settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_insert" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'system_admin'
    )
  );

CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'system_admin'
    )
  );

-- â”€â”€â”€ Catalog tables: All authenticated can read, admins can write â”€â”€â”€
CREATE POLICY "price_list_series_select" ON public.price_list_series
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "price_list_series_all" ON public.price_list_series
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('system_admin', 'ceo')
    )
  );

CREATE POLICY "telematics_packages_select" ON public.telematics_packages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "telematics_packages_all" ON public.telematics_packages
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('system_admin', 'ceo')
    )
  );

CREATE POLICY "container_mappings_select" ON public.container_mappings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "container_mappings_all" ON public.container_mappings
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('system_admin', 'ceo')
    )
  );

CREATE POLICY "config_matrices_select" ON public.configuration_matrices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "config_matrices_all" ON public.configuration_matrices
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('system_admin', 'ceo')
    )
  );

-- ==============================================================================
-- STEP 15: ADD company_id TO QUOTES (if not exists)
-- ==============================================================================

DO $$ BEGIN
  ALTER TABLE public.quotes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);

-- ==============================================================================
-- STEP 16: ADD shipping_entries TO QUOTES (if not exists)
-- ==============================================================================

DO $$ BEGIN
  ALTER TABLE public.quotes ADD COLUMN shipping_entries JSONB DEFAULT '[]'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN public.quotes.shipping_entries IS 'JSON array of quote shipping line entries';

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================

SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

COMMENT ON SCHEMA public IS 'Bisedge Quotation Dashboard - Schema Version 2.0';
-- ============================================================================== 
-- END SOURCE: SUPABASE_SCHEMA_V2.sql
-- ============================================================================== 

-- ============================================================================== 
-- OPTIONAL BOOTSTRAP USER UPSERT (CURRENT ENVIRONMENT RECORD)
-- ============================================================================== 
INSERT INTO public.users (id, email, full_name, role, is_active)
VALUES (
  'e1615e7e-71ee-48c9-8a6d-cb06c1ae6635',
  'nexzuis@gmail.com',
  'Nexzuis',
  'system_admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = 'system_admin',
  is_active = true;
