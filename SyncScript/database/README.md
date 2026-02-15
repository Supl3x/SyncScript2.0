# SyncScript Database Setup

This directory contains all SQL files needed to set up the SyncScript database in Supabase.

## Execution Order

Run these files in Supabase SQL Editor in the following order:

### 1. Core Schema
```sql
-- Run these first to create tables and basic structure
1. schema.sql              -- Creates all tables
2. functions.sql           -- Creates helper functions
3. triggers.sql            -- Creates triggers for auto-updates
4. rls_policies.sql        -- Creates Row Level Security policies
5. caching.sql             -- Creates caching functions
6. edge_cases.sql          -- Handles edge cases
```

### 2. Collaborator System
```sql
-- Run these to enable project collaboration features
7. project_collaborators.sql    -- Creates collaborator table and policies
8. FINAL_FIX_COLLABORATORS.sql  -- Fixes RLS recursion and adds helper function
9. notify_collaborator.sql      -- Creates notification function
```

### 3. Real-time Features (Optional)
```sql
-- Run this if you want real-time collaborative editing
10. realtime_documents.sql      -- Enables real-time document editing
```

## Quick Setup

If you're setting up from scratch, run all files in order:

```bash
# In Supabase Dashboard → SQL Editor
# Copy and paste each file's contents in order
```

## Key Features

### Collaborator System
- Direct project sharing (not just through organizations)
- Role-based access (owner, contributor, viewer)
- RLS policies that avoid recursion
- Real-time updates when collaborators are added/removed

### Functions
- `get_project_collaborators(project_id)` - Bypasses RLS to fetch all collaborators
- `notify_collaborator_added(project_id, user_id, invited_by)` - Creates notifications
- `is_project_member(project_id, user_id)` - Checks if user has access
- `get_user_role_in_project(project_id, user_id)` - Returns user's role

### Real-time Features
- Document presence tracking
- Collaborative editing
- Live cursor positions
- User awareness

## Troubleshooting

### Collaborators not showing in UI
- Ensure `FINAL_FIX_COLLABORATORS.sql` was run
- Check that the `get_project_collaborators` function exists
- Verify RLS policies don't have recursion

### 406 Errors
- Usually caused by RLS policy recursion
- Run `FINAL_FIX_COLLABORATORS.sql` to fix

### Function not found (404)
- Run `notify_collaborator.sql`
- Refresh Supabase schema cache: `NOTIFY pgrst, 'reload schema';`

## Documentation

See `/documents` folder for:
- `COLLABORATOR_SETUP.md` - Complete collaborator system guide
- `DATABASE_SETUP.md` - Detailed database setup instructions
- `QUICK_REALTIME_SETUP.md` - Real-time features setup

## Notes

- All tables use UUID primary keys
- RLS is enabled on all tables
- Soft deletes are used (deleted_at column)
- Timestamps are in UTC
- Real-time is enabled for key tables
