-- ============================================================================
-- FINAL FIX: Remove RLS Recursion from project_collaborators_select
-- This is the REAL fix for collaborators not showing in UI
-- ============================================================================

-- Drop the broken policy
DROP POLICY IF EXISTS project_collaborators_select ON public.project_collaborators;

-- Create the fixed policy (NO RECURSION)
CREATE POLICY project_collaborators_select ON public.project_collaborators
  FOR SELECT
  USING (
    -- You can see your own collaboration record
    user_id = auth.uid()
    
    -- OR you're the project owner (can see ALL collaborators)
    OR EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_id
        AND owner_id = auth.uid()
    )
  );

-- ============================================================================
-- ALTERNATIVE: If you want collaborators to see each other
-- Use a SECURITY DEFINER function to bypass RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_project_collaborators(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  user_id UUID,
  role TEXT,
  invited_by UUID,
  invited_at TIMESTAMPTZ,
  is_active BOOLEAN,
  user_email TEXT,
  user_full_name TEXT,
  user_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Check if the current user has access to this project
  IF NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
      AND (
        p.owner_id = auth.uid()
        OR p.visibility = 'public'
        OR EXISTS (
          SELECT 1 FROM project_collaborators pc
          WHERE pc.project_id = p.id
            AND pc.user_id = auth.uid()
            AND pc.is_active = TRUE
        )
      )
  ) THEN
    -- User doesn't have access, return empty
    RETURN;
  END IF;

  -- Return all collaborators for this project
  RETURN QUERY
  SELECT 
    pc.id,
    pc.project_id,
    pc.user_id,
    pc.role,
    pc.invited_by,
    pc.invited_at,
    pc.is_active,
    u.email as user_email,
    u.full_name as user_full_name,
    u.avatar_url as user_avatar_url
  FROM project_collaborators pc
  JOIN users u ON pc.user_id = u.id
  WHERE pc.project_id = p_project_id
    AND pc.is_active = TRUE
  ORDER BY pc.invited_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_project_collaborators(UUID) TO authenticated;

-- ============================================================================
-- Test the fix
-- ============================================================================

-- Test 1: Check the policy was updated
SELECT 
  policyname,
  qual
FROM pg_policies
WHERE tablename = 'project_collaborators'
  AND policyname = 'project_collaborators_select';

-- Expected: Should NOT have recursive project_collaborators check

-- ============================================================================
-- Test 2: Test the function (run this in your app, not SQL editor)
-- ============================================================================

-- SELECT * FROM get_project_collaborators('YOUR_PROJECT_ID');

-- ============================================================================
-- DONE! Now update the frontend to use the function
-- ============================================================================
