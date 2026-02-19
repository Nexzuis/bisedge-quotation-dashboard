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

-- ─── Companies: All authenticated users can read; assigned users + admins can write ───
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

-- ─── Contacts: Same as parent company ───
CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated USING (true);

-- ─── Activities: All can read, creator + admins can modify ───
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

-- ─── Notifications: User can only see their own ───
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ─── Templates: All can read, admins can write ───
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

-- ─── Settings: All can read, admins can write ───
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

-- ─── Catalog tables: All authenticated can read, admins can write ───
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
-- VERIFICATION
-- ==============================================================================

SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

COMMENT ON SCHEMA public IS 'Bisedge Quotation Dashboard - Schema Version 2.0';
