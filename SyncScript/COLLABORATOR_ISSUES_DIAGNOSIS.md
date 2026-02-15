# Collaborator & Email Issues - Complete Diagnosis & Fix

## 🔍 Issues Identified

### Issue 1: RLS Policy Recursion in `project_collaborators_select`
**Problem:** The SELECT policy has infinite recursion:
```sql
-- This policy checks project_collaborators WITHIN project_collaborators!
EXISTS (
  SELECT 1 FROM public.project_collaborators pc  -- ❌ RECURSION!
   WHERE pc.project_id = projects.id
     AND pc.user_id = auth.uid()
)
```

**Impact:** Collaborators can't see other collaborators because the query loops infinitely.

---

### Issue 2: Missing `projects_select` Policy for Collaborators
**Problem:** The `projects_select` RLS policy in `rls_policies.sql` doesn't check `project_collaborators` table:
```sql
-- Current policy only checks:
-- 1. owner_id = auth.uid()
-- 2. visibility = 'public'
-- 3. organization_id membership

-- ❌ MISSING: Check project_collaborators table!
```

**Impact:** Added collaborators can't see the project at all!

---

### Issue 3: Email Function Not Being Called Properly
**Problem:** The Edge Function might not be invoked or might be failing silently.

**Possible causes:**
1. Function not deployed
2. Secrets not set correctly
3. Network/CORS issues
4. Gmail SMTP authentication failing

---

## ✅ Complete Fix

### Step 1: Fix RLS Policies

Run this SQL in Supabase SQL Editor:

```sql
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
-- FIX 5: Update document_content RLS (for real-time editing)
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
```

---

### Step 2: Test Email Function

Open browser console and run:

```javascript
// Test if Edge Function is accessible
const { data, error } = await supabase.functions.invoke('send-collaboration-email', {
  body: {
    to: 'feras.malik20@gmail.com',
    subject: 'Test Email',
    project_name: 'Test Project',
    inviter_name: 'Test User',
    project_id: 'test-123'
  }
});

console.log('Email test result:', { data, error });
```

**Expected result:** 
- Success: `{ success: true, message: "Email sent successfully via Gmail SMTP" }`
- Failure: Check error message

---

### Step 3: Check Edge Function Logs

```bash
npx supabase functions logs send-collaboration-email --limit 20
```

Look for:
- "Gmail credentials not configured" → Secrets not set
- "Authentication failed" → Wrong Gmail password
- "Connection timeout" → Network issue

---

### Step 4: Verify Secrets Are Set

```bash
npx supabase secrets list
```

Should show:
- GMAIL_USER
- GMAIL_APP_PASSWORD
- APP_URL

---

## 🧪 Testing Steps

### Test 1: Add Collaborator
1. Login as User A (project owner)
2. Create a project
3. Click "Share"
4. Add User B's email
5. **Expected:** 
   - Success toast appears
   - User B appears in collaborators list immediately
   - User B receives email notification

### Test 2: Collaborator Access
1. Login as User B
2. Go to "Shared Research" or dashboard
3. **Expected:** See the project User A shared
4. Click on the project
5. **Expected:** Can view files, comments, etc.

### Test 3: Real-Time Editing
1. User A opens a document and clicks "Edit"
2. User B opens the same document and clicks "Edit"
3. User A types something
4. **Expected:** User B sees the changes in real-time
5. **Expected:** Both users see each other in the active users list

---

## 🐛 Debugging Checklist

### If collaborator doesn't appear in list:
- [ ] Check browser console for errors
- [ ] Verify RLS policies were updated (run Step 1 SQL)
- [ ] Check if user exists in database: `SELECT * FROM users WHERE email = 'user@email.com'`
- [ ] Check if collaboration was created: `SELECT * FROM project_collaborators WHERE project_id = 'xxx'`

### If collaborator can't access project:
- [ ] Verify `projects_select` policy includes `project_collaborators` check
- [ ] Check `is_active = TRUE` on the collaboration record
- [ ] Verify user is logged in with correct account

### If email doesn't send:
- [ ] Check Edge Function is deployed: `npx supabase functions list`
- [ ] Verify secrets: `npx supabase secrets list`
- [ ] Test Gmail credentials manually
- [ ] Check function logs: `npx supabase functions logs send-collaboration-email`
- [ ] Verify Gmail App Password is correct (16 characters, no spaces)

### If real-time editing doesn't work:
- [ ] Run `realtime_documents.sql` in Supabase SQL Editor
- [ ] Verify Realtime is enabled in Supabase dashboard
- [ ] Check browser console for WebSocket errors
- [ ] Verify both users have access to the project

---

## 📝 Summary of Changes Needed

1. **Run the SQL fixes above** in Supabase SQL Editor
2. **Verify Edge Function is deployed** with correct secrets
3. **Test with 2 different user accounts**
4. **Check browser console** for any errors

The main issue is that the RLS policies don't properly check the `project_collaborators` table, so even though collaborators are added to the database, they can't access the project or see other collaborators.

After running the SQL fixes, everything should work!
