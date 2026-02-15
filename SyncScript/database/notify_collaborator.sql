-- ============================================================================
-- Function to notify collaborator when added to a project
-- This creates a notification and can be extended to trigger email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_collaborator_added(
  p_project_id UUID,
  p_user_id UUID,
  p_invited_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_name TEXT;
  v_inviter_name TEXT;
BEGIN
  -- Get project name
  SELECT name INTO v_project_name
    FROM public.projects
   WHERE id = p_project_id;

  -- Get inviter name
  SELECT COALESCE(full_name, email) INTO v_inviter_name
    FROM public.users
   WHERE id = p_invited_by;

  -- Create notification
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    actor_id,
    metadata
  ) VALUES (
    p_user_id,
    'info',
    'Added to Project',
    v_inviter_name || ' added you to the project "' || v_project_name || '"',
    'project',
    p_project_id,
    p_invited_by,
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'invited_by', p_invited_by,
      'inviter_name', v_inviter_name
    )
  );

  -- Log activity
  PERFORM public.log_activity(
    p_invited_by,
    'add_collaborator',
    'project',
    p_project_id,
    NULL,
    jsonb_build_object('user_id', p_user_id),
    jsonb_build_object('action', 'collaborator_added')
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.notify_collaborator_added(UUID, UUID, UUID) TO authenticated;
