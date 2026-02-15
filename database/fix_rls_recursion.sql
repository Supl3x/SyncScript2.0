-- ============================================================================
-- Fix for Infinite Recursion in organization_members RLS Policy
-- Run this AFTER rls_policies.sql if you encounter the recursion error
-- ============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS org_members_select ON public.organization_members;

-- Recreate with fixed logic (uses function to avoid recursion)
CREATE POLICY org_members_select ON public.organization_members
  FOR SELECT
  USING (
    -- Check if user is org owner (no recursion)
    EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = organization_id
         AND owner_id = auth.uid()
    )
    -- OR use function to check membership (avoids recursion)
    OR public.get_user_role_in_org(organization_id, auth.uid()) IS NOT NULL
  );

-- ============================================================================
-- Alternative fix if the function approach doesn't work:
-- Use a simpler check that doesn't query the same table
-- ============================================================================

-- If the above doesn't work, uncomment this instead:
/*
DROP POLICY IF EXISTS org_members_select ON public.organization_members;

CREATE POLICY org_members_select ON public.organization_members
  FOR SELECT
  USING (
    -- Allow if user is the member themselves
    user_id = auth.uid()
    -- OR if user is org owner
    OR EXISTS (
      SELECT 1 FROM public.organizations
       WHERE id = organization_id
         AND owner_id = auth.uid()
    )
  );
*/
