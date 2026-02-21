-- ============================================================
-- Round 4 — Concurrency, Atomicity & Schema Alignment Migrations
-- Run ALL statements in Supabase SQL Editor BEFORE deploying code
-- ============================================================

-- Migration 1: Add missing statuses to CHECK constraint (Issue #10)
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('draft','pending-approval','in-review','changes-requested','approved','sent-to-customer','rejected','expired'));

-- Migration 2: Add updated_by column (Issue #11)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.users(id);

-- Migration 3: Create atomic quote ref generation RPC (Issue #9)
DO $$
DECLARE
  max_ref integer;
BEGIN
  SELECT COALESCE(MAX(CAST(split_part(quote_ref, '.', 1) AS integer)), 2139)
    INTO max_ref
    FROM quotes
    WHERE quote_ref ~ '^\d+\.\d+$';

  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'quote_ref_seq') THEN
    EXECUTE format('CREATE SEQUENCE quote_ref_seq START WITH %s', max_ref + 1);
  ELSE
    PERFORM setval('quote_ref_seq', max_ref);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION generate_next_quote_ref()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN nextval('quote_ref_seq')::text || '.0';
END;
$$;

REVOKE EXECUTE ON FUNCTION generate_next_quote_ref() FROM public;
GRANT EXECUTE ON FUNCTION generate_next_quote_ref() TO authenticated;

-- Migration 4: Create atomic save function with version guard (Issue #1)
CREATE OR REPLACE FUNCTION save_quote_if_version(
  p_id uuid,
  p_expected_version integer,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_ver integer;
  new_ver integer;
BEGIN
  SELECT version INTO current_ver
    FROM quotes
    WHERE id = p_id
    FOR UPDATE;

  IF FOUND AND current_ver != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'version', current_ver,
      'error', 'Version conflict - quote was modified remotely'
    );
  END IF;

  new_ver := (p_data->>'version')::integer;

  INSERT INTO quotes (
    id, quote_ref, version, status, created_by, assigned_to,
    customer_id, company_id, client_name, contact_name, contact_title,
    contact_email, contact_phone, client_address,
    factory_roe, customer_roe, discount_pct, annual_interest_rate,
    default_lease_term_months, battery_chemistry_lock, quote_type,
    slots, shipping_entries,
    approval_tier, approval_status, approval_notes, override_irr,
    submitted_by, submitted_at, approved_by, approved_at,
    rejected_by, rejected_at, rejection_reason,
    current_assignee_id, current_assignee_role, approval_chain,
    locked_by, locked_at, updated_at, updated_by,
    quote_date, validity_days, last_synced_at, sync_status
  ) VALUES (
    (p_data->>'id')::uuid,
    p_data->>'quote_ref',
    new_ver,
    p_data->>'status',
    (p_data->>'created_by')::uuid,
    (p_data->>'assigned_to')::uuid,
    (p_data->>'customer_id')::uuid,
    (p_data->>'company_id')::uuid,
    p_data->>'client_name',
    p_data->>'contact_name',
    p_data->>'contact_title',
    p_data->>'contact_email',
    p_data->>'contact_phone',
    (p_data->'client_address')::jsonb,
    (p_data->>'factory_roe')::numeric,
    (p_data->>'customer_roe')::numeric,
    (p_data->>'discount_pct')::numeric,
    (p_data->>'annual_interest_rate')::numeric,
    (p_data->>'default_lease_term_months')::integer,
    p_data->>'battery_chemistry_lock',
    p_data->>'quote_type',
    (p_data->'slots')::jsonb,
    (p_data->'shipping_entries')::jsonb,
    (p_data->>'approval_tier')::integer,
    p_data->>'approval_status',
    p_data->>'approval_notes',
    (p_data->>'override_irr')::boolean,
    (p_data->>'submitted_by')::uuid,
    (p_data->>'submitted_at')::timestamptz,
    (p_data->>'approved_by')::uuid,
    (p_data->>'approved_at')::timestamptz,
    (p_data->>'rejected_by')::uuid,
    (p_data->>'rejected_at')::timestamptz,
    p_data->>'rejection_reason',
    (p_data->>'current_assignee_id')::uuid,
    p_data->>'current_assignee_role',
    (p_data->'approval_chain')::jsonb,
    (p_data->>'locked_by')::uuid,
    (p_data->>'locked_at')::timestamptz,
    (p_data->>'updated_at')::timestamptz,
    (p_data->>'updated_by')::uuid,
    (p_data->>'quote_date')::date,
    (p_data->>'validity_days')::integer,
    (p_data->>'last_synced_at')::timestamptz,
    p_data->>'sync_status'
  )
  ON CONFLICT (id) DO UPDATE SET
    quote_ref = EXCLUDED.quote_ref,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    created_by = EXCLUDED.created_by,
    assigned_to = EXCLUDED.assigned_to,
    customer_id = EXCLUDED.customer_id,
    company_id = EXCLUDED.company_id,
    client_name = EXCLUDED.client_name,
    contact_name = EXCLUDED.contact_name,
    contact_title = EXCLUDED.contact_title,
    contact_email = EXCLUDED.contact_email,
    contact_phone = EXCLUDED.contact_phone,
    client_address = EXCLUDED.client_address,
    factory_roe = EXCLUDED.factory_roe,
    customer_roe = EXCLUDED.customer_roe,
    discount_pct = EXCLUDED.discount_pct,
    annual_interest_rate = EXCLUDED.annual_interest_rate,
    default_lease_term_months = EXCLUDED.default_lease_term_months,
    battery_chemistry_lock = EXCLUDED.battery_chemistry_lock,
    quote_type = EXCLUDED.quote_type,
    slots = EXCLUDED.slots,
    shipping_entries = EXCLUDED.shipping_entries,
    approval_tier = EXCLUDED.approval_tier,
    approval_status = EXCLUDED.approval_status,
    approval_notes = EXCLUDED.approval_notes,
    override_irr = EXCLUDED.override_irr,
    submitted_by = EXCLUDED.submitted_by,
    submitted_at = EXCLUDED.submitted_at,
    approved_by = EXCLUDED.approved_by,
    approved_at = EXCLUDED.approved_at,
    rejected_by = EXCLUDED.rejected_by,
    rejected_at = EXCLUDED.rejected_at,
    rejection_reason = EXCLUDED.rejection_reason,
    current_assignee_id = EXCLUDED.current_assignee_id,
    current_assignee_role = EXCLUDED.current_assignee_role,
    approval_chain = EXCLUDED.approval_chain,
    locked_by = EXCLUDED.locked_by,
    locked_at = EXCLUDED.locked_at,
    updated_at = EXCLUDED.updated_at,
    updated_by = EXCLUDED.updated_by,
    quote_date = EXCLUDED.quote_date,
    validity_days = EXCLUDED.validity_days,
    last_synced_at = EXCLUDED.last_synced_at,
    sync_status = EXCLUDED.sync_status;

  RETURN jsonb_build_object(
    'success', true,
    'version', new_ver,
    'id', p_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION save_quote_if_version(uuid, integer, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION save_quote_if_version(uuid, integer, jsonb) TO authenticated;
