-- RLS Policies for BIS Edge Quotation Dashboard
-- Applied to live Supabase instance on 2026-02-21

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residual_curves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- QUOTES
CREATE POLICY "quotes_select" ON public.quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "quotes_insert" ON public.quotes FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = created_by::text);
CREATE POLICY "quotes_update" ON public.quotes FOR UPDATE TO authenticated USING (auth.uid()::text = created_by::text OR auth.uid()::text = assigned_to::text OR auth.uid()::text = current_assignee_id::text OR auth.uid()::text = locked_by::text);
CREATE POLICY "quotes_delete" ON public.quotes FOR DELETE TO authenticated USING (auth.uid()::text = created_by::text);

-- COMPANIES (all reps read/write shared CRM data; only admins delete)
CREATE POLICY "companies_select" ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_insert" ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "companies_update" ON public.companies FOR UPDATE TO authenticated USING (true);
CREATE POLICY "companies_delete" ON public.companies FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('system_admin', 'ceo', 'local_leader'))
);

-- CONTACTS (all reps read/write shared CRM data; only admins delete)
CREATE POLICY "contacts_select" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('system_admin', 'ceo', 'local_leader'))
);

-- ACTIVITIES (all reps read/write; only creator or admins delete)
CREATE POLICY "activities_select" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "activities_insert" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "activities_update" ON public.activities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "activities_delete" ON public.activities FOR DELETE TO authenticated USING (
  auth.uid()::text = created_by::text
  OR EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('system_admin', 'ceo', 'local_leader'))
);

-- NOTIFICATIONS
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid()::text = user_id::text);

-- USERS
-- Update/delete aligned with app permission model (src/auth/permissions.ts):
--   - system_admin role has admin:users by default
--   - Any role can gain it via can_manage_users permission override
-- Unprivileged self-update is NOT allowed because the row contains
-- privileged fields (role, is_active, permission_overrides). Only users
-- with system_admin role or can_manage_users override may update/delete.
-- Use a column-restricted RPC if self-profile editing (name, phone, etc.)
-- is needed for non-admin users in the future.
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text
    AND (
      role = 'system_admin'
      OR (permission_overrides->>'can_manage_users')::boolean = true
    )
  )
);
CREATE POLICY "users_delete" ON public.users FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id::text = auth.uid()::text
    AND (
      role = 'system_admin'
      OR (permission_overrides->>'can_manage_users')::boolean = true
    )
  )
);

-- AUDIT LOG
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- CONFIG TABLES
CREATE POLICY "commission_tiers_select" ON public.commission_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "residual_curves_select" ON public.residual_curves FOR SELECT TO authenticated USING (true);
CREATE POLICY "templates_select" ON public.templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "commission_tiers_admin" ON public.commission_tiers FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('system_admin', 'ceo', 'local_leader')));
CREATE POLICY "residual_curves_admin" ON public.residual_curves FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('system_admin', 'ceo', 'local_leader')));
CREATE POLICY "templates_admin" ON public.templates FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users WHERE id::text = auth.uid()::text AND role IN ('system_admin', 'ceo', 'local_leader')));

-- REPLICA IDENTITY
-- Required for Supabase Realtime to populate payload.old on UPDATE events.
-- Without this, approval notifications cannot detect status transitions and
-- will silently skip (see useApprovalNotifications.tsx).
ALTER TABLE public.quotes REPLICA IDENTITY FULL;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (status);
CREATE INDEX IF NOT EXISTS idx_quotes_approval_status ON public.quotes (approval_status);
CREATE INDEX IF NOT EXISTS idx_quotes_current_assignee ON public.quotes (current_assignee_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON public.quotes (created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_assigned_to ON public.quotes (assigned_to);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes (company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts (company_id);
CREATE INDEX IF NOT EXISTS idx_activities_company ON public.activities (company_id);

-- UNIQUENESS CONSTRAINTS
ALTER TABLE public.quotes ADD CONSTRAINT uq_quotes_quote_ref UNIQUE (quote_ref);
ALTER TABLE public.users ADD CONSTRAINT uq_users_email UNIQUE (email);
