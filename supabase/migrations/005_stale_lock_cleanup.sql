-- ============================================================
-- Migration 005: Stale lock cleanup function and amended save RPC
-- ============================================================
--
-- PURPOSE
-- -------
-- (1) cleanup_stale_locks(): Clear locked_by / locked_at on quotes
--     when a user closes their browser without a clean unmount
--     (network drop, hard kill, crash). The useQuoteLock hook tries
--     to release the lock on unmount and on beforeunload, but those
--     paths are not guaranteed. This function is the safety net.
--
-- (2) Amended save_quote_if_version: Allow saves when the existing
--     lock is stale (> 1 hour old), preventing a crashed session
--     from permanently blocking writes by another user.
--
-- STALE THRESHOLD
-- ---------------
-- Locks older than 1 hour are considered stale. This is generous
-- enough to survive meetings and lunch breaks while still preventing
-- indefinite ghost locks from crashed sessions.
--
-- NULL locked_at HANDLING
-- -----------------------
-- COALESCE(locked_at, NOW()) treats a row with locked_by set but
-- locked_at NULL as "just locked" (active). This protects legacy rows
-- that pre-date the locked_at column from being accidentally bypassed.
--
-- SCHEDULING (requires Supabase Pro plan)
-- ----------------------------------------
-- On Supabase Pro, pg_cron can call cleanup_stale_locks() periodically.
-- On Free / Pro Starter, it is invoked client-side before each lock
-- acquisition (see useQuoteLock.ts → cleanupStaleLocks()).
--
-- ============================================================

-- ============================================================
-- (1) Function: cleanup_stale_locks
-- Sets locked_by = NULL, locked_at = NULL on quotes whose lock
-- timestamp is older than 1 hour. Runs as SECURITY DEFINER to
-- bypass RLS. search_path is pinned to prevent hijacking.
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_stale_locks()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.quotes
  SET locked_by = NULL,
      locked_at = NULL
  WHERE locked_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Grant execute to authenticated users (client-triggered fallback on
-- lock acquisition) and the service role (pg_cron / Edge Function).
-- The anon key cannot invoke this function.
REVOKE ALL ON FUNCTION cleanup_stale_locks() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_stale_locks() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_locks() TO service_role;

-- ============================================================
-- (2) Amended save_quote_if_version
-- Adds stale-lock bypass to the lock enforcement gate.
-- All other logic is identical to the version in 002_schema_and_rpcs.sql.
-- ============================================================

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
  current_owner uuid;
  current_lock_holder uuid;
  current_locked_at timestamptz;
  new_ver integer;
  calling_user uuid;
BEGIN
  -- Authorization: require authenticated user
  calling_user := auth.uid();
  IF calling_user IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Lock the row (or confirm it doesn't exist yet)
  SELECT version, created_by, locked_by, locked_at
    INTO current_ver, current_owner, current_lock_holder, current_locked_at
    FROM quotes
    WHERE id = p_id
    FOR UPDATE;

  -- Lock enforcement with stale-lock bypass:
  --   Reject only when ALL of the following are true:
  --     • another user holds the lock (locked_by IS NOT NULL AND != caller)
  --     • the lock is FRESH (COALESCE(locked_at, NOW()) > NOW() - 1 hour)
  --     • the caller is not a system_admin
  --
  --   A stale lock (locked_at < NOW() - 1 hour) is treated as if no
  --   lock exists, allowing the save to proceed.
  --
  --   COALESCE(locked_at, NOW()) treats NULL locked_at as "just now",
  --   so legacy rows with locked_by set but locked_at NULL are treated
  --   as actively locked (rejected) — no accidental bypass.
  IF FOUND THEN
    IF current_lock_holder IS NOT NULL
       AND current_lock_holder != calling_user
       AND COALESCE(current_locked_at, NOW()) > NOW() - INTERVAL '1 hour'
       AND NOT EXISTS (SELECT 1 FROM users WHERE id = calling_user AND role = 'system_admin')
    THEN
      RETURN jsonb_build_object(
        'success', false,
        'version', current_ver,
        'error', 'Quote is locked by another user'
      );
    END IF;
  END IF;

  -- Ownership check: only creator, assigned_to, current_assignee, or lock holder may write
  IF FOUND THEN
    IF current_owner != calling_user
       AND (SELECT assigned_to FROM quotes WHERE id = p_id) IS DISTINCT FROM calling_user
       AND (SELECT current_assignee_id FROM quotes WHERE id = p_id) IS DISTINCT FROM calling_user
       AND (SELECT locked_by FROM quotes WHERE id = p_id) IS DISTINCT FROM calling_user
       AND NOT EXISTS (SELECT 1 FROM users WHERE id = calling_user AND role = 'system_admin')
    THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Not authorized to modify this quote'
      );
    END IF;
  END IF;

  IF FOUND AND current_ver != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'version', current_ver,
      'error', 'Version conflict - quote was modified remotely'
    );
  END IF;

  new_ver := (p_data->>'version')::integer;

  -- Use p_id for the row id — prevents p_data.id mismatch attack
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
    p_id,
    p_data->>'quote_ref',
    new_ver,
    p_data->>'status',
    COALESCE((p_data->>'created_by')::uuid, calling_user),
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
    calling_user,
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

-- ============================================================
-- pg_cron schedule (Supabase Pro plan required)
-- ============================================================
-- Uncomment the block below once pg_cron is enabled on your project.
-- This schedules cleanup_stale_locks() to run every hour.
--
-- SELECT cron.schedule(
--   'cleanup-stale-locks',     -- job name (must be unique)
--   '0 * * * *',               -- cron expression: every hour on the hour
--   $cron$
--     SELECT cleanup_stale_locks();
--   $cron$
-- );
-- ============================================================
