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
