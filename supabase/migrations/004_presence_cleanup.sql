-- ============================================================
-- Migration 004: Presence cleanup function and scheduled job
-- ============================================================
--
-- PURPOSE
-- -------
-- Remove stale rows from quote_presence when a user closes their
-- browser without a clean unmount (network drop, hard kill, crash).
-- The usePresence hook tries to delete its own row on unmount and on
-- beforeunload, but those paths are not guaranteed. This function is
-- the safety net.
--
-- STALE THRESHOLD
-- ---------------
-- Rows whose last_seen_at is older than 5 minutes are considered
-- stale. The presence heartbeat fires every 30 seconds (configurable
-- via VITE_PRESENCE_HEARTBEAT_MS), so 5 minutes gives 10 missed
-- heartbeats before eviction — generous enough to survive short
-- network interruptions.
--
-- SCHEDULING (requires Supabase Pro plan)
-- ----------------------------------------
-- pg_cron is available on Supabase Pro and above. Uncomment the
-- cron.schedule call below after upgrading. On the Free / Pro Starter
-- plan you can invoke cleanup_stale_presence() manually or via an
-- Edge Function on a Supabase scheduled job (Dashboard → Edge
-- Functions → Scheduled Functions).
--
-- ============================================================

-- Function: cleanup_stale_presence
-- Deletes quote_presence rows that have not been refreshed within the
-- last 5 minutes. Runs as SECURITY DEFINER so it bypasses RLS and can
-- delete rows for any user. search_path is pinned to prevent
-- search-path hijacking attacks.

CREATE OR REPLACE FUNCTION cleanup_stale_presence()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.quote_presence
  WHERE last_seen_at < NOW() - INTERVAL '5 minutes';
END;
$$;

-- Grant execute to authenticated users (client-triggered fallback on lock
-- acquisition) and the service role (pg_cron / Edge Function scheduled job).
-- The anon key cannot invoke this function.
REVOKE ALL ON FUNCTION cleanup_stale_presence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_stale_presence() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stale_presence() TO service_role;

-- ============================================================
-- pg_cron schedule (Supabase Pro plan required)
-- ============================================================
-- Uncomment the block below once pg_cron is enabled on your project.
-- This schedules cleanup_stale_presence() to run every 5 minutes.
--
-- NOTE: pg_cron jobs must be created in the "cron" schema which is
--       only present when the pg_cron extension is enabled. Check
--       Dashboard → Database → Extensions → pg_cron.
--
-- SELECT cron.schedule(
--   'cleanup-stale-presence',  -- job name (must be unique)
--   '*/5 * * * *',             -- cron expression: every 5 minutes
--   $cron$
--     SELECT cleanup_stale_presence();
--   $cron$
-- );
-- ============================================================
