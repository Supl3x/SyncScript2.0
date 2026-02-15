-- ============================================================================
-- PROJECT COLLABORATORS TABLE
-- Allows direct sharing of projects to individual users (not just through orgs)
-- ============================================================================

-- Create project_collaborators table
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'contributor', 'viewer')),
  invited_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at       TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON public.project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user ON public.project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_active ON public.project_collaborators(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators FORCE ROW LEVEL SECURITY;

-- RLS Policies for project_collaborators
DROP POLICY IF EXISTS project_collaborators_select ON public.project_collaborators;
CREATE POLICY project_collaborators_select ON public.project_collaborators
  FOR SELECT
  USING (
    -- User can see collaborators of projects they have access to
    EXISTS (
      SELECT 1 FROM public.projects
       WHERE id = project_id
         AND (
           owner_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.project_collaborators pc
              WHERE pc.project_id = projects.id
                AND pc.user_id = auth.uid()
                AND pc.is_active = TRUE
           )
         )
    )
  );

DROP POLICY IF EXISTS project_collaborators_insert ON public.project_collaborators;
CREATE POLICY project_collaborators_insert ON public.project_collaborators
  FOR INSERT
  WITH CHECK (
    -- Only project owner can add collaborators
    EXISTS (
      SELECT 1 FROM public.projects
       WHERE id = project_id
         AND owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_collaborators_update ON public.project_collaborators;
CREATE POLICY project_collaborators_update ON public.project_collaborators
  FOR UPDATE
  USING (
    -- Project owner can update any collaborator, collaborator can update themselves
    EXISTS (
      SELECT 1 FROM public.projects
       WHERE id = project_id
         AND owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS project_collaborators_delete ON public.project_collaborators;
CREATE POLICY project_collaborators_delete ON public.project_collaborators
  FOR DELETE
  USING (
    -- Project owner can remove any collaborator, collaborator can remove themselves
    EXISTS (
      SELECT 1 FROM public.projects
       WHERE id = project_id
         AND owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- Function to send collaboration notification
-- Email is sent via Edge Function called from the frontend
CREATE OR REPLACE FUNCTION public.notify_collaborator_added(
  p_project_id UUID,
  p_user_id UUID,
  p_invited_by UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_project_name TEXT;
  v_inviter_name TEXT;
  v_inviter_email TEXT;
BEGIN
  -- Get project details
  SELECT name INTO v_project_name
  FROM public.projects
  WHERE id = p_project_id;

  -- Get inviter details
  SELECT full_name, email INTO v_inviter_name, v_inviter_email
  FROM public.users
  WHERE id = p_invited_by;

  -- Create a notification for the user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_user_id,
    'update',
    'You have been added to a project',
    COALESCE(v_inviter_name, v_inviter_email) || ' added you to "' || COALESCE(v_project_name, 'a project') || '"',
    jsonb_build_object(
      'project_id', p_project_id,
      'invited_by', p_invited_by,
      'action', 'collaborator_added'
    )
  );
END;
$$;
