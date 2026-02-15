-- ============================================================================
-- SyncScript — Edge Cases & Integrity Guards
-- Run LAST after all other SQL files
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. Active-only views (soft-delete filters)
--    Use these instead of raw tables to never accidentally show deleted data
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.active_projects AS
SELECT * FROM public.projects WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_tasks AS
SELECT * FROM public.tasks WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_comments AS
SELECT * FROM public.comments WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_attachments AS
SELECT * FROM public.attachments WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.active_users AS
SELECT * FROM public.users WHERE deleted_at IS NULL AND is_active = TRUE AND is_banned = FALSE;

CREATE OR REPLACE VIEW public.active_organizations AS
SELECT * FROM public.organizations WHERE deleted_at IS NULL AND is_active = TRUE;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. Concurrency: Advisory lock helpers for vault editing
--    Prevents two users from making conflicting edits simultaneously
-- ────────────────────────────────────────────────────────────────────────────

-- Acquire a lock on a vault (returns TRUE if acquired, FALSE if already locked)
CREATE OR REPLACE FUNCTION public.acquire_vault_lock(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT;
  v_acquired BOOLEAN;
BEGIN
  -- Convert UUID to a deterministic bigint for pg_try_advisory_lock
  v_lock_key := ('x' || LEFT(REPLACE(p_project_id::TEXT, '-', ''), 15))::BIT(60)::BIGINT;
  
  -- Try to acquire the lock (non-blocking)
  v_acquired := pg_try_advisory_lock(v_lock_key);

  IF v_acquired THEN
    -- Log the lock acquisition
    PERFORM public.log_activity(
      p_user_id, 'lock_acquired', 'project', p_project_id,
      NULL, NULL,
      jsonb_build_object('lock_key', v_lock_key)
    );
  END IF;

  RETURN v_acquired;
END;
$$;

-- Release a vault lock
CREATE OR REPLACE FUNCTION public.release_vault_lock(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock_key BIGINT;
BEGIN
  v_lock_key := ('x' || LEFT(REPLACE(p_project_id::TEXT, '-', ''), 15))::BIT(60)::BIGINT;
  RETURN pg_advisory_unlock(v_lock_key);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Orphan detection
--    Finds comments/attachments referencing entities that have been deleted
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.find_orphaned_comments()
RETURNS TABLE (
  comment_id    UUID,
  entity_type   entity_type,
  entity_id     UUID,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.entity_type, c.entity_id, c.created_at
  FROM public.comments c
  WHERE c.deleted_at IS NULL
    AND (
      (c.entity_type = 'project' AND NOT EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = c.entity_id AND p.deleted_at IS NULL
      ))
      OR (c.entity_type = 'task' AND NOT EXISTS (
        SELECT 1 FROM public.tasks t WHERE t.id = c.entity_id AND t.deleted_at IS NULL
      ))
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.find_orphaned_attachments()
RETURNS TABLE (
  attachment_id UUID,
  entity_type   entity_type,
  entity_id     UUID,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.entity_type, a.entity_id, a.created_at
  FROM public.attachments a
  WHERE a.deleted_at IS NULL
    AND a.entity_id IS NOT NULL
    AND (
      (a.entity_type = 'project' AND NOT EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = a.entity_id AND p.deleted_at IS NULL
      ))
      OR (a.entity_type = 'task' AND NOT EXISTS (
        SELECT 1 FROM public.tasks t WHERE t.id = a.entity_id AND t.deleted_at IS NULL
      ))
    );
END;
$$;

-- Soft-delete orphaned records
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_records()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comments INT;
  v_attachments INT;
BEGIN
  -- Soft-delete orphaned comments
  WITH orphans AS (
    SELECT comment_id FROM public.find_orphaned_comments()
  )
  UPDATE public.comments
     SET deleted_at = NOW()
   WHERE id IN (SELECT comment_id FROM orphans)
     AND deleted_at IS NULL;
  GET DIAGNOSTICS v_comments = ROW_COUNT;

  -- Soft-delete orphaned attachments
  WITH orphans AS (
    SELECT attachment_id FROM public.find_orphaned_attachments()
  )
  UPDATE public.attachments
     SET deleted_at = NOW()
   WHERE id IN (SELECT attachment_id FROM orphans)
     AND deleted_at IS NULL;
  GET DIAGNOSTICS v_attachments = ROW_COUNT;

  RETURN jsonb_build_object(
    'orphaned_comments_cleaned', v_comments,
    'orphaned_attachments_cleaned', v_attachments
  );
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. Rate-limit tracking
--    Lightweight request tracking for API abuse prevention
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier  TEXT NOT NULL,              -- user_id, ip_address, or api_key_prefix
  endpoint    TEXT NOT NULL,              -- e.g., '/api/vaults', '/api/upload'
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INT NOT NULL DEFAULT 1,
  max_requests  INT NOT NULL DEFAULT 100, -- per window
  window_seconds INT NOT NULL DEFAULT 3600,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(identifier, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup
  ON public.rate_limits(window_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;

-- Only admins can view rate limit data
CREATE POLICY rate_limits_admin_only ON public.rate_limits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
       WHERE id = auth.uid()
         AND role = 'admin'
    )
  );

-- Check rate limit (returns TRUE if allowed, FALSE if throttled)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INT DEFAULT 100,
  p_window_seconds INT DEFAULT 3600
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INT;
BEGIN
  -- Calculate the current window start
  v_window_start := DATE_TRUNC('hour', NOW());

  -- Upsert the rate limit counter
  INSERT INTO public.rate_limits (identifier, endpoint, window_start, request_count, max_requests, window_seconds)
  VALUES (p_identifier, p_endpoint, v_window_start, 1, p_max_requests, p_window_seconds)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = public.rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  RETURN v_current_count <= p_max_requests;
END;
$$;

-- Cleanup old rate limit windows
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM public.rate_limits
   WHERE window_start < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. Data integrity constraints (additional)
-- ────────────────────────────────────────────────────────────────────────────

-- Ensure project due_date is after start_date
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_projects_dates;
ALTER TABLE public.projects ADD CONSTRAINT chk_projects_dates
  CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date);

-- Ensure task due_date is after start_date
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_dates;
ALTER TABLE public.tasks ADD CONSTRAINT chk_tasks_dates
  CHECK (due_date IS NULL OR start_date IS NULL OR due_date >= start_date);

-- Ensure file sizes are positive
ALTER TABLE public.attachments DROP CONSTRAINT IF EXISTS chk_attachments_file_size;
ALTER TABLE public.attachments ADD CONSTRAINT chk_attachments_file_size
  CHECK (file_size > 0);

-- Ensure rate limits are positive
ALTER TABLE public.rate_limits DROP CONSTRAINT IF EXISTS chk_rate_limits_positive;
ALTER TABLE public.rate_limits ADD CONSTRAINT chk_rate_limits_positive
  CHECK (max_requests > 0 AND window_seconds > 0 AND request_count >= 0);

-- Prevent self-referencing parent tasks at infinite depth
-- (tasks can have parents, but not themselves)
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS chk_tasks_no_self_parent;
ALTER TABLE public.tasks ADD CONSTRAINT chk_tasks_no_self_parent
  CHECK (parent_task_id IS NULL OR parent_task_id != id);


-- ────────────────────────────────────────────────────────────────────────────
-- 6. Prevent duplicate active memberships
--    (extra safety alongside the UNIQUE constraint)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_duplicate_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE organization_id = NEW.organization_id
       AND user_id = NEW.user_id
       AND is_active = TRUE
       AND id != COALESCE(NEW.id, uuid_generate_v4())
  ) THEN
    RAISE EXCEPTION 'User is already an active member of this organization';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_membership ON public.organization_members;
CREATE TRIGGER trg_prevent_duplicate_membership
  BEFORE INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW
  WHEN (NEW.is_active = TRUE)
  EXECUTE FUNCTION public.prevent_duplicate_membership();


-- ============================================================================
-- All SQL files complete! ✅
-- 
-- Execution order reminder:
--   1. schema.sql
--   2. functions.sql
--   3. triggers.sql
--   4. rls_policies.sql
--   5. caching.sql
--   6. edge_cases.sql
-- ============================================================================
