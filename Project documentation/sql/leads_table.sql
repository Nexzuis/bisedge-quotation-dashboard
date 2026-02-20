-- ============================================================
-- Leads Table Migration — BIS Edge AI Lead Generation MVP
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable trigram extension for fuzzy search (if not already)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  trading_name TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  website TEXT DEFAULT '',
  company_size TEXT DEFAULT '',
  annual_revenue_estimate TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  province TEXT DEFAULT '',
  country TEXT DEFAULT 'South Africa',
  decision_maker_name TEXT DEFAULT '',
  decision_maker_title TEXT DEFAULT '',
  decision_maker_email TEXT DEFAULT '',
  decision_maker_phone TEXT DEFAULT '',
  decision_maker_linkedin TEXT DEFAULT '',
  source_name TEXT DEFAULT 'manual',
  source_url TEXT DEFAULT '',
  ai_confidence INTEGER DEFAULT 0 CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
  ai_reasoning TEXT DEFAULT '',
  scraped_at TIMESTAMPTZ,
  buy_probability INTEGER DEFAULT 5 CHECK (buy_probability >= 1 AND buy_probability <= 10),
  qualification_status TEXT DEFAULT 'new' CHECK (
    qualification_status IN ('new','reviewing','qualified','rejected','contacted','converted','stale')
  ),
  qualified_by UUID REFERENCES users(id),
  qualified_at TIMESTAMPTZ,
  rejection_reason TEXT DEFAULT '',
  converted_company_id UUID REFERENCES companies(id),
  converted_contact_id UUID REFERENCES contacts(id),
  converted_at TIMESTAMPTZ,
  converted_by UUID REFERENCES users(id),
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(qualification_status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(buy_probability DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source_name);
CREATE INDEX IF NOT EXISTS idx_leads_province ON leads(province);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_company_trgm ON leads USING gin(company_name gin_trgm_ops);

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view leads
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated USING (true);

-- All authenticated users can create leads
CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated WITH CHECK (true);

-- All authenticated users can update leads
CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated USING (true);

-- Only manager+ roles can delete leads
CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('sales_manager','local_leader','ceo','system_admin'))
);
