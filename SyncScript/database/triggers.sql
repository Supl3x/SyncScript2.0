-- ============================================================================
-- SyncScript — Database Triggers
-- Run AFTER functions.sql
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. handle_new_user
--    Fired on auth.users INSERT → creates a row in public.users + user_profiles
--    This is what AuthContext.tsx relies on for automatic profile creation
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create the main user record
  INSERT INTO public.users (
    id,
    email,
    full_name,
    username,
    avatar_url,
    role,
    email_verified,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    'user',
    COALESCE((NEW.raw_user_meta_data->>'email_verified')::BOOLEAN, FALSE),
    NOW(),
    NOW()
  );

  -- Create an empty profile record
  INSERT INTO public.user_profiles (
    user_id,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to Supabase auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────────────────────
-- 2. update_updated_at_column
--    Generic trigger — sets updated_at = NOW() on any UPDATE
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to every table that has an updated_at column
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_org_members_updated_at ON public.organization_members;
CREATE TRIGGER trg_org_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON public.comments;
CREATE TRIGGER trg_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_attachments_updated_at ON public.attachments;
CREATE TRIGGER trg_attachments_updated_at
  BEFORE UPDATE ON public.attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_webhooks_updated_at ON public.webhooks;
CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tags_updated_at ON public.tags;
CREATE TRIGGER trg_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_cache_updated_at ON public.cache;
CREATE TRIGGER trg_cache_updated_at
  BEFORE UPDATE ON public.cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ────────────────────────────────────────────────────────────────────────────
-- 3. log_project_changes
--    Audit trail for project (Vault) create / update / delete
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_project_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_user_id := NEW.owner_id;
    PERFORM public.log_activity(
      v_user_id, v_action, 'project', NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('vault_name', NEW.name)
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if this is a soft delete
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'delete';
    ELSE
      v_action := 'update';
    END IF;
    v_user_id := COALESCE(NEW.owner_id, OLD.owner_id);
    PERFORM public.log_activity(
      v_user_id, v_action, 'project', NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('vault_name', NEW.name)
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'hard_delete';
    v_user_id := OLD.owner_id;
    PERFORM public.log_activity(
      v_user_id, v_action, 'project', OLD.id,
      to_jsonb(OLD),
      NULL,
      jsonb_build_object('vault_name', OLD.name)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_project_changes ON public.projects;
CREATE TRIGGER trg_log_project_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.log_project_changes();


-- ────────────────────────────────────────────────────────────────────────────
-- 4. log_task_changes
--    Audit trail for task create / update / delete
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_user_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_user_id := NEW.created_by;
    PERFORM public.log_activity(
      v_user_id, v_action, 'task', NEW.id,
      NULL, to_jsonb(NEW),
      jsonb_build_object('task_title', NEW.title, 'project_id', NEW.project_id)
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'delete';
    ELSE
      v_action := 'update';
    END IF;
    v_user_id := COALESCE(NEW.created_by, OLD.created_by);
    PERFORM public.log_activity(
      v_user_id, v_action, 'task', NEW.id,
      to_jsonb(OLD), to_jsonb(NEW),
      jsonb_build_object('task_title', NEW.title, 'project_id', NEW.project_id)
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'hard_delete';
    v_user_id := OLD.created_by;
    PERFORM public.log_activity(
      v_user_id, v_action, 'task', OLD.id,
      to_jsonb(OLD), NULL,
      jsonb_build_object('task_title', OLD.title, 'project_id', OLD.project_id)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_task_changes ON public.tasks;
CREATE TRIGGER trg_log_task_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_changes();


-- ────────────────────────────────────────────────────────────────────────────
-- 5. notify_on_collaborator_added
--    When a new member is added to an organization → notify them
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_collaborator_added()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_name TEXT;
  v_inviter_name TEXT;
BEGIN
  -- Get organization name
  SELECT name INTO v_org_name
    FROM public.organizations
   WHERE id = NEW.organization_id;

  -- Get inviter name (if available)
  IF NEW.invited_by IS NOT NULL THEN
    SELECT COALESCE(full_name, email) INTO v_inviter_name
      FROM public.users
     WHERE id = NEW.invited_by;
  ELSE
    v_inviter_name := 'Someone';
  END IF;

  -- Create notification for the invited user
  PERFORM public.create_notification(
    NEW.user_id,
    'info'::notification_type,
    'You''ve been added to a team!',
    v_inviter_name || ' added you to "' || v_org_name || '" as ' || NEW.role::TEXT,
    'organization',
    NEW.organization_id,
    NEW.invited_by,
    jsonb_build_object(
      'organization_name', v_org_name,
      'role', NEW.role::TEXT
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_collaborator_added ON public.organization_members;
CREATE TRIGGER trg_notify_collaborator_added
  AFTER INSERT ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_collaborator_added();


-- ────────────────────────────────────────────────────────────────────────────
-- 6. mark_comment_edited
--    Sets is_edited = TRUE when a comment's content is updated
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_comment_edited()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    NEW.is_edited := TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mark_comment_edited ON public.comments;
CREATE TRIGGER trg_mark_comment_edited
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.mark_comment_edited();


-- ────────────────────────────────────────────────────────────────────────────
-- 7. auto_complete_project
--    When all tasks in a project are completed → mark project completed
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_complete_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total INT;
  v_completed INT;
  v_progress INT;
BEGIN
  -- Only fire when task status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT
      COUNT(*) FILTER (WHERE deleted_at IS NULL),
      COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'completed')
    INTO v_total, v_completed
    FROM public.tasks
    WHERE project_id = NEW.project_id;

    IF v_total > 0 THEN
      v_progress := (v_completed * 100) / v_total;

      UPDATE public.projects
         SET progress = v_progress,
             status = CASE WHEN v_completed = v_total THEN 'completed'::task_status ELSE status END,
             completed_at = CASE WHEN v_completed = v_total THEN NOW() ELSE completed_at END
       WHERE id = NEW.project_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_complete_project ON public.tasks;
CREATE TRIGGER trg_auto_complete_project
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_complete_project();


-- ============================================================================
-- Done! Proceed to rls_policies.sql →
-- ============================================================================
