-- ============================================================================
-- SyncScript — Caching Configuration
-- Run AFTER rls_policies.sql
-- ============================================================================
-- The cache table is already created in schema.sql.
-- This file adds cleanup utilities and indexing strategies.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. cache_cleanup()
--    Removes all expired cache entries. Call periodically.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cache_cleanup()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM public.cache
   WHERE expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log the cleanup
  IF v_count > 0 THEN
    PERFORM public.log_activity(
      NULL, 'cache_cleanup', 'cache', NULL,
      NULL, NULL,
      jsonb_build_object('entries_removed', v_count)
    );
  END IF;

  RETURN v_count;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. cache_stats()
--    Returns cache statistics for monitoring
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cache_stats()
RETURNS TABLE (
  total_entries    BIGINT,
  expired_entries  BIGINT,
  active_entries   BIGINT,
  oldest_entry     TIMESTAMPTZ,
  newest_entry     TIMESTAMPTZ,
  total_size_bytes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)                                                    AS total_entries,
    COUNT(*) FILTER (WHERE c.expires_at < NOW())                AS expired_entries,
    COUNT(*) FILTER (WHERE c.expires_at >= NOW())               AS active_entries,
    MIN(c.created_at)                                           AS oldest_entry,
    MAX(c.created_at)                                           AS newest_entry,
    COALESCE(SUM(pg_column_size(c.value)), 0)::BIGINT           AS total_size_bytes
  FROM public.cache c;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Materialized views for high-traffic queries
--    These act as a caching layer for expensive aggregations
-- ────────────────────────────────────────────────────────────────────────────

-- Vault summary stats (source count, collaborator count, last activity)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_project_stats AS
SELECT
  p.id                                                     AS project_id,
  p.name                                                   AS project_name,
  p.owner_id,
  COUNT(DISTINCT t.id) FILTER (WHERE t.deleted_at IS NULL) AS task_count,
  COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed' AND t.deleted_at IS NULL) AS completed_task_count,
  COUNT(DISTINCT c.id) FILTER (WHERE c.deleted_at IS NULL) AS comment_count,
  COUNT(DISTINCT a.id) FILTER (WHERE a.deleted_at IS NULL) AS attachment_count,
  COUNT(DISTINCT om.user_id) FILTER (WHERE om.is_active)   AS collaborator_count,
  MAX(GREATEST(
    t.updated_at,
    c.updated_at,
    a.updated_at
  ))                                                       AS last_activity_at
FROM public.projects p
LEFT JOIN public.tasks t ON t.project_id = p.id
LEFT JOIN public.comments c ON c.entity_type = 'project' AND c.entity_id = p.id
LEFT JOIN public.attachments a ON a.entity_type = 'project' AND a.entity_id = p.id
LEFT JOIN public.organization_members om ON om.organization_id = p.organization_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.owner_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_project_stats_id ON public.mv_project_stats(project_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_project_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_project_stats;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. Automatic cache invalidation on project changes
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invalidate_project_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Invalidate any cache entries tagged with this project
  PERFORM public.cache_invalidate_by_tag('project:' || COALESCE(NEW.id, OLD.id)::TEXT);
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_invalidate_project_cache ON public.projects;
CREATE TRIGGER trg_invalidate_project_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_project_cache();


-- ============================================================================
-- PERIODIC CLEANUP SETUP
-- ============================================================================
-- Option A: If pg_cron is available (Supabase Pro plans):
-- Uncomment the following to auto-cleanup every hour:
--
--   SELECT cron.schedule(
--     'cleanup-expired-cache',
--     '0 * * * *',  -- every hour
--     $$SELECT public.cache_cleanup()$$
--   );
--
--   SELECT cron.schedule(
--     'cleanup-expired-sessions',
--     '0 */6 * * *',  -- every 6 hours
--     $$SELECT public.cleanup_expired_sessions()$$
--   );
--
--   SELECT cron.schedule(
--     'refresh-project-stats',
--     '*/15 * * * *',  -- every 15 minutes
--     $$SELECT public.refresh_project_stats()$$
--   );
--
-- Option B: Manual cleanup — run these periodically via your app or Supabase dashboard:
--   SELECT public.cache_cleanup();
--   SELECT public.cleanup_expired_sessions();
--   SELECT public.refresh_project_stats();
-- ============================================================================


-- ============================================================================
-- Done! Proceed to edge_cases.sql →
-- ============================================================================
