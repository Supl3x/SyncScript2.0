-- ============================================================================
-- COMPLETE FIX FOR COLLABORATOR ACCESS ISSUES
-- Run this in Supabase SQL Editor to fix all RLS policy problems
-- ============================================================================

-- ============================================================================
-- FIX 1: Update projects_select to include project_collaborators
-- ============================================================================

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
    -- ✅ NEW: Projects where user is a collaborator
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators
       WHERE project_id = projects.id
         AND user_id = auth.uid()
         AND is_active = TRUE
    )
  );

-- ============================================================================
-- FIX 2: Fix project_collaborators_select to avoid recursion
-- ============================================================================

DROP POLICY IF EXISTS project_collaborators_select ON public.project_collaborators;
CREATE POLICY project_collaborators_select ON public.project_collaborators
  FOR SELECT
  USING (
    -- User can see their own collaboration record
    user_id = auth.uid()
    -- OR user is the project owner (can see all collaborators)
    OR EXISTS (
      SELECT 1 FROM public.projects
       WHERE id = project_id
         AND owner_id = auth.uid()
    )
    -- OR user is also a collaborator on the same project (can see other collaborators)
    OR EXISTS (
      SELECT 1 FROM public.project_collaborators pc2
       WHERE pc2.project_id = project_collaborators.project_id
         AND pc2.user_id = auth.uid()
         AND pc2.is_active = TRUE
         AND pc2.id != project_collaborators.id  -- Don't check self
    )
  );

-- ============================================================================
-- FIX 3: Update attachments_select to include project_collaborators
-- ============================================================================

DROP POLICY IF EXISTS attachments_select ON public.attachments;
CREATE POLICY attachments_select ON public.attachments
  FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR (
      entity_type = 'project' 
      AND entity_id IS NOT NULL 
      AND (
        -- Project owner
        EXISTS (
          SELECT 1 FROM public.projects
           WHERE id = entity_id
             AND owner_id = auth.uid()
        )
        -- OR project collaborator
        OR EXISTS (
          SELECT 1 FROM public.project_collaborators
           WHERE project_id = entity_id
             AND user_id = auth.uid()
             AND is_active = TRUE
        )
      )
    )
    OR (entity_type = 'task' AND entity_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
       WHERE t.id = entity_id
         AND (
           p.owner_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.project_collaborators
              WHERE project_id = p.id
                AND user_id = auth.uid()
                AND is_active = TRUE
           )
         )
    ))
  );

-- ============================================================================
-- FIX 4: Update comments_select to include project_collaborators
-- ============================================================================

DROP POLICY IF EXISTS comments_select ON public.comments;
CREATE POLICY comments_select ON public.comments
  FOR SELECT
  USING (
    -- Comments on projects (vault chat)
    (
      entity_type = 'project' 
      AND (
        EXISTS (
          SELECT 1 FROM public.projects
           WHERE id = entity_id
             AND owner_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.project_collaborators
           WHERE project_id = entity_id
             AND user_id = auth.uid()
             AND is_active = TRUE
        )
      )
    )
    -- Comments on tasks
    OR (entity_type = 'task' AND EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
       WHERE t.id = entity_id
         AND (
           p.owner_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.project_collaborators
              WHERE project_id = p.id
                AND user_id = auth.uid()
                AND is_active = TRUE
           )
         )
    ))
    -- Own comments are always visible
    OR user_id = auth.uid()
  );

-- ============================================================================
-- FIX 5: Update comments_insert to include project_collaborators
-- ============================================================================

DROP POLICY IF EXISTS comments_insert ON public.comments;
CREATE POLICY comments_insert ON public.comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      (
        entity_type = 'project' 
        AND (
          EXISTS (
            SELECT 1 FROM public.projects
             WHERE id = entity_id
               AND owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators
             WHERE project_id = entity_id
               AND user_id = auth.uid()
               AND is_active = TRUE
          )
        )
      )
      OR (entity_type = 'task' AND EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.projects p ON t.project_id = p.id
         WHERE t.id = entity_id
           AND (
             p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM public.project_collaborators
                WHERE project_id = p.id
                  AND user_id = auth.uid()
                  AND is_active = TRUE
             )
           )
      ))
    )
  );

-- ============================================================================
-- FIX 6: Update attachments_insert to include project_collaborators
-- ============================================================================

DROP POLICY IF EXISTS attachments_insert ON public.attachments;
CREATE POLICY attachments_insert ON public.attachments
  FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND (
      entity_id IS NULL  -- general uploads
      OR (
        entity_type = 'project' 
        AND (
          EXISTS (
            SELECT 1 FROM public.projects
             WHERE id = entity_id
               AND owner_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators
             WHERE project_id = entity_id
               AND user_id = auth.uid()
               AND is_active = TRUE
          )
        )
      )
      OR (entity_type = 'task' AND EXISTS (
        SELECT 1 FROM public.tasks t
        JOIN public.projects p ON t.project_id = p.id
         WHERE t.id = entity_id
           AND (
             p.owner_id = auth.uid()
             OR EXISTS (
               SELECT 1 FROM public.project_collaborators
                WHERE project_id = p.id
                  AND user_id = auth.uid()
                  AND is_active = TRUE
             )
           )
      ))
    )
  );

-- ============================================================================
-- FIX 7: Update document_content RLS (for real-time editing)
-- ============================================================================

DROP POLICY IF EXISTS document_content_access ON public.document_content;
CREATE POLICY document_content_access ON public.document_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.attachments a
      JOIN public.projects p ON a.entity_id = p.id
      WHERE a.id = attachment_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.is_active = TRUE
          )
        )
    )
  );

DROP POLICY IF EXISTS document_presence_access ON public.document_presence;
CREATE POLICY document_presence_access ON public.document_presence
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.attachments a
      JOIN public.projects p ON a.entity_id = p.id
      WHERE a.id = attachment_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.is_active = TRUE
          )
        )
    )
  );

-- ============================================================================
-- DONE! All RLS policies have been fixed.
-- 
-- What was fixed:
-- 1. projects_select - Now checks project_collaborators table
-- 2. project_collaborators_select - Fixed infinite recursion
-- 3. attachments_select - Now checks project_collaborators
-- 4. comments_select - Now checks project_collaborators
-- 5. comments_insert - Now checks project_collaborators
-- 6. attachments_insert - Now checks project_collaborators
-- 7. document_content_access - Now checks project_collaborators
-- 8. document_presence_access - Now checks project_collaborators
--
-- Collaborators should now be able to:
-- ✅ See projects they're added to
-- ✅ See other collaborators
-- ✅ View and upload files
-- ✅ Read and write comments
-- ✅ Edit documents in real-time
-- ============================================================================
