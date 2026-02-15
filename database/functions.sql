-- ============================================================================
-- SyncScript — Database Functions
-- Run AFTER schema.sql
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. is_project_member(project_id, user_id)
--    Returns TRUE if user owns the project OR is a member of its organization
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_owner_id UUID;
  v_org_id   UUID;
  v_is_member BOOLEAN;
BEGIN
  -- Get project owner and org
  SELECT owner_id, organization_id
    INTO v_owner_id, v_org_id
    FROM public.projects
   WHERE id = p_project_id;

  -- Direct owner
  IF v_owner_id = p_user_id THEN
    RETURN TRUE;
  END IF;

  -- Organization member
  IF v_org_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM public.organization_members
       WHERE organization_id = v_org_id
         AND user_id = p_user_id
         AND is_active = TRUE
    ) INTO v_is_member;
    RETURN v_is_member;
  END IF;

  RETURN FALSE;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. get_user_role_in_project(project_id, user_id)
--    Returns 'owner' | 'admin' | 'user' | 'moderator' | 'guest' | NULL
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role_in_project(p_project_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_owner_id UUID;
  v_org_id   UUID;
  v_role     user_role;
BEGIN
  SELECT owner_id, organization_id
    INTO v_owner_id, v_org_id
    FROM public.projects
   WHERE id = p_project_id;

  IF v_owner_id = p_user_id THEN
    RETURN 'owner';
  END IF;

  IF v_org_id IS NOT NULL THEN
    SELECT role INTO v_role
      FROM public.organization_members
     WHERE organization_id = v_org_id
       AND user_id = p_user_id
       AND is_active = TRUE;

    IF FOUND THEN
      RETURN v_role::TEXT;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. user_is_org_member(org_id, user_id)
--    Returns TRUE if user is org owner or member (bypasses RLS to avoid recursion)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_is_org_member(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if user is org owner
  IF EXISTS (
    SELECT 1 FROM public.organizations
     WHERE id = p_org_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is a member (bypasses RLS due to SECURITY DEFINER)
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE organization_id = p_org_id
       AND user_id = p_user_id
       AND is_active = TRUE
  );
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. get_user_role_in_org(org_id, user_id)
--    Returns the user's role within an organization or NULL
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(p_org_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_role     user_role;
  v_owner_id UUID;
BEGIN
  -- Check if user is org owner
  SELECT owner_id INTO v_owner_id
    FROM public.organizations
   WHERE id = p_org_id;

  IF v_owner_id = p_user_id THEN
    RETURN 'owner';
  END IF;

  -- Check membership
  SELECT role INTO v_role
    FROM public.organization_members
   WHERE organization_id = p_org_id
     AND user_id = p_user_id
     AND is_active = TRUE;

  IF FOUND THEN
    RETURN v_role::TEXT;
  END IF;

  RETURN NULL;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 4. log_activity(...)
--    Convenience function to insert an audit log entry
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id     UUID,
  p_action      TEXT,
  p_entity_type TEXT,
  p_entity_id   UUID DEFAULT NULL,
  p_old_values  JSONB DEFAULT NULL,
  p_new_values  JSONB DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id, action, entity_type, entity_id,
    old_values, new_values, metadata
  ) VALUES (
    p_user_id, p_action, p_entity_type, p_entity_id,
    p_old_values, p_new_values, p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 5. generate_unique_slug(name, existing_table)
--    Creates a URL-safe slug, appending a number if collision exists
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_unique_slug(p_name TEXT, p_table TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slug       TEXT;
  v_base_slug  TEXT;
  v_counter    INT := 0;
  v_exists     BOOLEAN;
BEGIN
  -- Sanitize: lowercase, replace non-alphanum with hyphens, trim hyphens
  v_base_slug := LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(
    REGEXP_REPLACE(p_name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '[\s]+', '-', 'g'
  )));
  v_slug := v_base_slug;

  LOOP
    EXECUTE FORMAT('SELECT EXISTS(SELECT 1 FROM public.%I WHERE slug = $1)', p_table)
      INTO v_exists USING v_slug;

    IF NOT v_exists THEN
      RETURN v_slug;
    END IF;

    v_counter := v_counter + 1;
    v_slug := v_base_slug || '-' || v_counter;
  END LOOP;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 6. cleanup_expired_sessions()
--    Deactivates sessions past their expiry
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.sessions
     SET is_active = FALSE
   WHERE is_active = TRUE
     AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 7. Cache helper functions
-- ────────────────────────────────────────────────────────────────────────────

-- cache_get: Returns the cached value or NULL if expired/missing
CREATE OR REPLACE FUNCTION public.cache_get(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value
    FROM public.cache
   WHERE key = p_key
     AND expires_at > NOW();

  RETURN v_value;
END;
$$;

-- cache_set: Upserts a cache entry with a TTL in seconds
CREATE OR REPLACE FUNCTION public.cache_set(p_key TEXT, p_value JSONB, p_ttl_seconds INT DEFAULT 3600, p_tags TEXT[] DEFAULT '{}')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.cache (key, value, tags, expires_at, updated_at)
  VALUES (p_key, p_value, p_tags, NOW() + (p_ttl_seconds || ' seconds')::INTERVAL, NOW())
  ON CONFLICT (key)
  DO UPDATE SET
    value = EXCLUDED.value,
    tags = EXCLUDED.tags,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();
END;
$$;

-- cache_invalidate: Removes a cache entry by key
CREATE OR REPLACE FUNCTION public.cache_invalidate(p_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.cache WHERE key = p_key;
END;
$$;

-- cache_invalidate_by_tag: Removes all cache entries with a given tag
CREATE OR REPLACE FUNCTION public.cache_invalidate_by_tag(p_tag TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  DELETE FROM public.cache WHERE p_tag = ANY(tags);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 8. create_notification(...)
--    Convenience function to send an in-app notification
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id     UUID,
  p_type        notification_type,
  p_title       TEXT,
  p_message     TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id   UUID DEFAULT NULL,
  p_actor_id    UUID DEFAULT NULL,
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message,
    entity_type, entity_id, actor_id, metadata
  ) VALUES (
    p_user_id, p_type, p_title, p_message,
    p_entity_type, p_entity_id, p_actor_id, p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;


-- ============================================================================
-- Done! Proceed to triggers.sql →
-- ============================================================================
