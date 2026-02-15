-- ============================================================================
-- SyncScript — Row Level Security (RLS) Policies
-- Run AFTER triggers.sql
-- ============================================================================
-- Policy naming convention: [table]_[operation]_[who]
-- All policies use auth.uid() which returns the current Supabase user's UUID
-- ============================================================================
-- NOTE: This file uses DROP POLICY IF EXISTS to allow safe re-running
-- ============================================================================


-- ════════════════════════════════════════════════════════════════════════════
-- USERS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Everyone can read basic user info (for collaborator lists, mentions, etc.)
DROP POLICY IF EXISTS users_select_all ON public.users;
CREATE POLICY users_select_all ON public.users
  FOR SELECT
  USING (TRUE);

-- Users can only update their own record
DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users cannot delete themselves (handled by auth cascade)
-- Users cannot insert (handled by handle_new_user trigger)


-- ════════════════════════════════════════════════════════════════════════════
-- USER_PROFILES
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
CREATE POLICY user_profiles_update_own ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert is handled by the handle_new_user trigger (SECURITY DEFINER)


-- ════════════════════════════════════════════════════════════════════════════
-- ORGANIZATIONS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations FORCE ROW LEVEL SECURITY;

-- Members can see their organizations
DROP POLICY IF EXISTS organizations_select_member ON public.organizations;
CREATE POLICY organizations_select_member ON public.organizations
  FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members
       WHERE organization_id = id
         AND user_id = auth.uid()
         AND is_active = TRUE
    )
  );

-- Only the org owner can update
DROP POLICY IF EXISTS organizations_update_owner ON public.organizations;
CREATE POLICY organizations_update_owner ON public.organizations
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Any authenticated user can create an organization
DROP POLICY IF EXISTS organizations_insert_authenticated ON public.organizations;
CREATE POLICY organizations_insert_authenticated ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only the org owner can delete
DROP POLICY IF EXISTS organizations_delete_owner ON public.organizations;
CREATE POLICY organizations_delete_owner ON public.organizations
  FOR DELETE
  USING (owner_id = auth.uid());


-- ════════════════════════════════════════════════════════════════════════════
-- ORGANIZATION_MEMBERS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members FORCE ROW LEVEL SECURITY;

-- Members can see all members of their organizations
-- Fixed to avoid infinite recursion using SECURITY DEFINER function
DROP POLICY IF EXISTS org_members_select ON public.organization_members;
CREATE POLICY org_members_select ON public.organization_members
  FOR SELECT
  USING (
    -- User can see their own membership
    user_id = auth.uid()
    -- OR use helper function to check membership (avoids recursion)
    OR public.user_is_org_member(organization_id, auth.uid())
  );

-- Only org owners/admins can add members
DROP POLICY IF EXISTS org_members_insert ON public.organization_members;
CREATE POLICY org_members_insert ON public.organization_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = organization_id
         AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
       WHERE om.organization_id = organization_id
         AND om.user_id = auth.uid()
         AND om.role IN ('admin')
         AND om.is_active = TRUE
    )
  );

-- Only org owners/admins can update member roles
DROP POLICY IF EXISTS org_members_update ON public.organization_members;
CREATE POLICY org_members_update ON public.organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = organization_id
         AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
       WHERE om.organization_id = organization_id
         AND om.user_id = auth.uid()
         AND om.role IN ('admin')
         AND om.is_active = TRUE
    )
  );

-- Only org owners can remove members; members can remove themselves
DROP POLICY IF EXISTS org_members_delete ON public.organization_members;
CREATE POLICY org_members_delete ON public.organization_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = organization_id
         AND owner_id = auth.uid()
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- PROJECTS (Knowledge Vaults)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

-- Users can see their own projects, org projects, and public projects
DROP POLICY IF EXISTS projects_select ON public.projects;
CREATE POLICY projects_select ON public.projects
  FOR SELECT
  USING (
    -- Own projects
    owner_id = auth.uid()
    -- Public projects
    OR visibility = 'public'
    -- Projects in user's organizations
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members
         WHERE organization_id = projects.organization_id
           AND user_id = auth.uid()
           AND is_active = TRUE
      )
    )
  );

-- Owner can insert projects
DROP POLICY IF EXISTS projects_insert ON public.projects;
CREATE POLICY projects_insert ON public.projects
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Owner and org admins can update projects; Contributors can update non-critical fields
DROP POLICY IF EXISTS projects_update ON public.projects;
CREATE POLICY projects_update ON public.projects
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members
         WHERE organization_id = projects.organization_id
           AND user_id = auth.uid()
           AND role IN ('admin', 'user')
           AND is_active = TRUE
      )
    )
  );

-- Only owner can delete (soft-delete)
DROP POLICY IF EXISTS projects_delete ON public.projects;
CREATE POLICY projects_delete ON public.projects
  FOR DELETE
  USING (owner_id = auth.uid());


-- ════════════════════════════════════════════════════════════════════════════
-- TASKS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

-- Users can see tasks in projects they have access to
DROP POLICY IF EXISTS tasks_select ON public.tasks;
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT
  USING (
    public.is_project_member(project_id, auth.uid())
  );

-- Contributors+ can create tasks
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
CREATE POLICY tasks_insert ON public.tasks
  FOR INSERT
  WITH CHECK (
    public.get_user_role_in_project(project_id, auth.uid()) IN ('owner', 'admin', 'user')
  );

-- Contributors+ can update tasks
DROP POLICY IF EXISTS tasks_update ON public.tasks;
CREATE POLICY tasks_update ON public.tasks
  FOR UPDATE
  USING (
    public.get_user_role_in_project(project_id, auth.uid()) IN ('owner', 'admin', 'user')
  );

-- Only owner/admin can delete tasks
DROP POLICY IF EXISTS tasks_delete ON public.tasks;
CREATE POLICY tasks_delete ON public.tasks
  FOR DELETE
  USING (
    public.get_user_role_in_project(project_id, auth.uid()) IN ('owner', 'admin')
  );


-- ════════════════════════════════════════════════════════════════════════════
-- COMMENTS (Vault Chat / Scribbles)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments FORCE ROW LEVEL SECURITY;

-- Users can read comments on entities they have access to
-- For project-type entities, check project membership
DROP POLICY IF EXISTS comments_select ON public.comments;
CREATE POLICY comments_select ON public.comments
  FOR SELECT
  USING (
    -- Comments on projects (vault chat)
    (entity_type = 'project' AND public.is_project_member(entity_id, auth.uid()))
    -- Comments on tasks
    OR (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM public.tasks t
       WHERE t.id = entity_id
         AND public.is_project_member(t.project_id, auth.uid())
    ))
    -- Own comments are always visible
    OR user_id = auth.uid()
  );

-- Contributors+ can create comments
DROP POLICY IF EXISTS comments_insert ON public.comments;
CREATE POLICY comments_insert ON public.comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (entity_type = 'project' AND public.get_user_role_in_project(entity_id, auth.uid()) IN ('owner', 'admin', 'user'))
      OR (entity_type = 'task' AND EXISTS (
        SELECT 1 FROM public.tasks t
         WHERE t.id = entity_id
           AND public.get_user_role_in_project(t.project_id, auth.uid()) IN ('owner', 'admin', 'user')
      ))
    )
  );

-- Users can only update their own comments
DROP POLICY IF EXISTS comments_update_own ON public.comments;
CREATE POLICY comments_update_own ON public.comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments; project owners can delete any
DROP POLICY IF EXISTS comments_delete ON public.comments;
CREATE POLICY comments_delete ON public.comments
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR (entity_type = 'project' AND public.get_user_role_in_project(entity_id, auth.uid()) = 'owner')
  );


-- ════════════════════════════════════════════════════════════════════════════
-- ATTACHMENTS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments FORCE ROW LEVEL SECURITY;

-- Users can see attachments for entities they have access to
DROP POLICY IF EXISTS attachments_select ON public.attachments;
CREATE POLICY attachments_select ON public.attachments
  FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR (entity_type = 'project' AND entity_id IS NOT NULL AND public.is_project_member(entity_id, auth.uid()))
    OR (entity_type = 'task' AND entity_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tasks t
       WHERE t.id = entity_id
         AND public.is_project_member(t.project_id, auth.uid())
    ))
  );

-- Contributors+ can upload attachments
DROP POLICY IF EXISTS attachments_insert ON public.attachments;
CREATE POLICY attachments_insert ON public.attachments
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      entity_id IS NULL  -- general uploads
      OR (entity_type = 'project' AND public.get_user_role_in_project(entity_id, auth.uid()) IN ('owner', 'admin', 'user'))
      OR (entity_type = 'task' AND EXISTS (
        SELECT 1 FROM public.tasks t
         WHERE t.id = entity_id
           AND public.get_user_role_in_project(t.project_id, auth.uid()) IN ('owner', 'admin', 'user')
      ))
    )
  );

-- Only uploader can update their own attachment metadata
DROP POLICY IF EXISTS attachments_update_own ON public.attachments;
CREATE POLICY attachments_update_own ON public.attachments
  FOR UPDATE
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Uploader or project owner can delete
DROP POLICY IF EXISTS attachments_delete ON public.attachments;
CREATE POLICY attachments_delete ON public.attachments
  FOR DELETE
  USING (
    uploaded_by = auth.uid()
    OR (entity_type = 'project' AND entity_id IS NOT NULL AND public.get_user_role_in_project(entity_id, auth.uid()) = 'owner')
  );


-- ════════════════════════════════════════════════════════════════════════════
-- ACTIVITY_LOGS (Immutable audit trail)
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs FORCE ROW LEVEL SECURITY;

-- Users can see their own activity; admins see all
DROP POLICY IF EXISTS activity_logs_select ON public.activity_logs;
CREATE POLICY activity_logs_select ON public.activity_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
       WHERE id = auth.uid()
         AND role = 'admin'
    )
  );

-- Insert is handled by SECURITY DEFINER functions (log_activity, triggers)
-- No direct INSERT policy needed for regular users since triggers use SECURITY DEFINER

-- Prevent updates and deletes — logs are immutable
-- (No UPDATE or DELETE policies = denied by default with RLS enabled)


-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

-- Users can only see their own notifications
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Insert handled by SECURITY DEFINER functions; also allow direct inserts from the user's perspective
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own notifications (mark read)
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());


-- ════════════════════════════════════════════════════════════════════════════
-- WEBHOOKS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks FORCE ROW LEVEL SECURITY;

-- Org owners/admins can see webhooks
DROP POLICY IF EXISTS webhooks_select ON public.webhooks;
CREATE POLICY webhooks_select ON public.webhooks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = organization_id
         AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.organization_members
       WHERE organization_id = webhooks.organization_id
         AND user_id = auth.uid()
         AND role = 'admin'
         AND is_active = TRUE
    )
  );

-- Org owners can manage webhooks
DROP POLICY IF EXISTS webhooks_insert ON public.webhooks;
CREATE POLICY webhooks_insert ON public.webhooks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = organization_id
         AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS webhooks_update ON public.webhooks;
CREATE POLICY webhooks_update ON public.webhooks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = organization_id
         AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS webhooks_delete ON public.webhooks;
CREATE POLICY webhooks_delete ON public.webhooks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = organization_id
         AND owner_id = auth.uid()
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- API_KEYS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;

-- Users can see their own API keys
DROP POLICY IF EXISTS api_keys_select_own ON public.api_keys;
CREATE POLICY api_keys_select_own ON public.api_keys
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS api_keys_insert_own ON public.api_keys;
CREATE POLICY api_keys_insert_own ON public.api_keys
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS api_keys_update_own ON public.api_keys;
CREATE POLICY api_keys_update_own ON public.api_keys
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS api_keys_delete_own ON public.api_keys;
CREATE POLICY api_keys_delete_own ON public.api_keys
  FOR DELETE
  USING (user_id = auth.uid());


-- ════════════════════════════════════════════════════════════════════════════
-- SESSIONS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;

-- Users can only see their own sessions
DROP POLICY IF EXISTS sessions_select_own ON public.sessions;
CREATE POLICY sessions_select_own ON public.sessions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS sessions_insert_own ON public.sessions;
CREATE POLICY sessions_insert_own ON public.sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sessions_update_own ON public.sessions;
CREATE POLICY sessions_update_own ON public.sessions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sessions_delete_own ON public.sessions;
CREATE POLICY sessions_delete_own ON public.sessions
  FOR DELETE
  USING (user_id = auth.uid());


-- ════════════════════════════════════════════════════════════════════════════
-- TAGS
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags FORCE ROW LEVEL SECURITY;

-- Tags are readable by org members (or globally if no org)
DROP POLICY IF EXISTS tags_select ON public.tags;
CREATE POLICY tags_select ON public.tags
  FOR SELECT
  USING (
    organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.organization_members
       WHERE organization_id = tags.organization_id
         AND user_id = auth.uid()
         AND is_active = TRUE
    )
  );

-- Authenticated users can create tags
DROP POLICY IF EXISTS tags_insert ON public.tags;
CREATE POLICY tags_insert ON public.tags
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Org owners can update tags
DROP POLICY IF EXISTS tags_update ON public.tags;
CREATE POLICY tags_update ON public.tags
  FOR UPDATE
  USING (
    organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = tags.organization_id
         AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS tags_delete ON public.tags;
CREATE POLICY tags_delete ON public.tags
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = tags.organization_id
         AND owner_id = auth.uid()
    )
  );


-- ════════════════════════════════════════════════════════════════════════════
-- CACHE
-- ════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cache FORCE ROW LEVEL SECURITY;

-- Cache operations are done via SECURITY DEFINER functions
-- No direct user access needed
DROP POLICY IF EXISTS cache_select_admin ON public.cache;
CREATE POLICY cache_select_admin ON public.cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
       WHERE id = auth.uid()
         AND role = 'admin'
    )
  );


-- ============================================================================
-- Done! Proceed to caching.sql →
-- ============================================================================
