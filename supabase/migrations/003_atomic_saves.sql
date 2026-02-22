-- ============================================================
-- 003_atomic_saves.sql
-- Created: 2026-02-22
-- Purpose: Atomic delete+insert for commission tiers and residual curves.
--          Replaces the non-atomic two-request pattern in SupabaseAdapter.ts.
--          PostgreSQL functions are implicitly transactional — if any
--          statement fails, the entire function call rolls back automatically.
-- ============================================================

-- Atomic save for commission tiers
CREATE OR REPLACE FUNCTION save_commission_tiers_atomic(p_tiers jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delete all existing tiers
  DELETE FROM commission_tiers;

  -- Insert new tiers (if any)
  IF jsonb_array_length(p_tiers) > 0 THEN
    INSERT INTO commission_tiers (id, min_margin, max_margin, commission_pct)
    SELECT
      COALESCE(elem->>'id', gen_random_uuid()::text)::uuid,
      (elem->>'min_margin')::numeric,
      (elem->>'max_margin')::numeric,
      (elem->>'commission_pct')::numeric
    FROM jsonb_array_elements(p_tiers) AS elem;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION save_commission_tiers_atomic(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION save_commission_tiers_atomic(jsonb) TO authenticated;

-- Atomic save for residual curves
CREATE OR REPLACE FUNCTION save_residual_curves_atomic(p_curves jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Delete all existing curves
  DELETE FROM residual_curves;

  -- Insert new curves (if any)
  IF jsonb_array_length(p_curves) > 0 THEN
    INSERT INTO residual_curves (id, chemistry, term_36, term_48, term_60, term_72, term_84)
    SELECT
      COALESCE(elem->>'id', gen_random_uuid()::text)::uuid,
      elem->>'chemistry',
      (elem->>'term_36')::numeric,
      (elem->>'term_48')::numeric,
      (elem->>'term_60')::numeric,
      (elem->>'term_72')::numeric,
      (elem->>'term_84')::numeric
    FROM jsonb_array_elements(p_curves) AS elem;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION save_residual_curves_atomic(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION save_residual_curves_atomic(jsonb) TO authenticated;
