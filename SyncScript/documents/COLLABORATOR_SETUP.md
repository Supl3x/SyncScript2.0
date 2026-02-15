# Final Solution: Collaborators Not Showing in UI

## The Problem

When adding a collaborator:
1. ✅ Collaborator IS added to database
2. ❌ Collaborator does NOT appear in UI
3. ❌ Browser console shows 406 errors

## Root Cause

The `project_collaborators_select` RLS policy had **recursive logic** that created a chicken-and-egg problem:
- To see collaborators, you must be a collaborator
- But to check if you're a collaborator, you need to query project_collaborators
- But that query is blocked by RLS!

## The Solution

**Two-part fix:**

### Part 1: Fix the RLS Policy (Remove Recursion)
Run `FINAL_FIX_COLLABORATORS.sql` in Supabase SQL Editor

This creates a SECURITY DEFINER function that bypasses RLS and checks access properly.

### Part 2: Update Frontend to Use the Function
The frontend now calls `get_project_collaborators()` function instead of directly querying the table.

## How to Apply the Fix

### Step 1: Run the SQL
```bash
# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Open FINAL_FIX_COLLABORATORS.sql
# 3. Click "Run"
```

### Step 2: Frontend is Already Updated
The `useProjectCollaborators` hook now uses the `get_project_collaborators` function.

### Step 3: Test
1. Open your app
2. Log in as a project owner
3. Click "Share" on a project
4. Add a collaborator email
5. **Expected**: Collaborator appears immediately in the list
6. **Expected**: No 406 errors in console

## What Changed

### Before (Broken):
```typescript
// Direct query with RLS recursion
const { data } = await supabase
  .from('project_collaborators')
  .select('*, user:users(...)')
  .eq('project_id', projectId);
// ❌ Blocked by RLS
```

### After (Fixed):
```typescript
// Use SECURITY DEFINER function
const { data } = await supabase
  .rpc('get_project_collaborators', { 
    p_project_id: projectId 
  });
// ✅ Works! Function bypasses RLS recursion
```

## Testing Checklist

- [ ] Run `FINAL_FIX_COLLABORATORS.sql` in Supabase
- [ ] Restart your dev server (to pick up code changes)
- [ ] Log in as project owner
- [ ] Add a collaborator
- [ ] Collaborator appears in list immediately
- [ ] No 406 errors in console
- [ ] Log in as the collaborator
- [ ] Collaborator can see the shared project
- [ ] Collaborator can access project files

## Why This Works

The `get_project_collaborators` function:
1. Runs with `SECURITY DEFINER` (bypasses RLS)
2. Manually checks if user has access to the project
3. Returns all collaborators if access is granted
4. No recursive RLS checks!

## Next Steps

After confirming collaborators work:
1. Test with multiple users
2. Test role changes (viewer → contributor)
3. Test removing collaborators
4. Then tackle email notifications separately

---

**Status**: Ready to test
**Files Changed**: 
- `database/FINAL_FIX_COLLABORATORS.sql` (new)
- `src/hooks/useSupabaseExtended.ts` (updated)
