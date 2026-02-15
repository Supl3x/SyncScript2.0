# Database Integration Checklist

## Overview
This document tracks the integration of the SyncScript database schema into the application. The database is located in the `database/` folder and consists of 6 SQL files that must be executed in order.

## Database Schema Files (Execution Order)
1. ✅ `schema.sql` - Core tables and structure
2. ✅ `functions.sql` - Database helper functions
3. ✅ `triggers.sql` - Automatic triggers (user creation, audit logs, etc.)
4. ✅ `rls_policies.sql` - Row Level Security policies
5. ✅ `caching.sql` - Caching utilities and materialized views
6. ✅ `edge_cases.sql` - Edge case handling and integrity constraints

## Integration Status

### ✅ Core Infrastructure
- [x] Supabase client configured (`src/lib/supabase.ts`)
- [x] TypeScript types generated (`src/lib/database.types.ts`)
- [x] Auth context integrated with database (`src/contexts/AuthContext.tsx`)
- [x] Basic hooks created (`src/hooks/useSupabase.ts`)

### ✅ Tables Integration Status

#### Users & Authentication
- [x] `users` table - Integrated via AuthContext
- [x] `user_profiles` table - Auto-created via trigger
- [x] User registration/login working
- [x] Profile updates working

#### Projects (Vaults)
- [x] `projects` table - Fully integrated
- [x] Create vault functionality (`NewVaultPage.tsx`)
- [x] List vaults (`MyVaults.tsx`)
- [x] View vault (`VaultWorkspace.tsx`)
- [x] Update vault
- [x] Delete vault (soft delete)
- [ ] Use `generate_unique_slug()` function for slug generation
- [ ] Integrate project stats from materialized view

#### Tasks
- [x] `tasks` table - Basic integration
- [x] Create task
- [x] List tasks by project
- [x] Update task
- [x] Delete task (soft delete)
- [ ] Task assignment UI
- [ ] Task dependencies (parent_task_id)
- [ ] Task progress tracking

#### Comments (Vault Chat)
- [x] `comments` table - Schema defined
- [ ] Create comment hook
- [ ] List comments by entity
- [ ] Update comment
- [ ] Delete comment
- [ ] Integrate into VaultWorkspace for vault chat
- [ ] Threaded comments (parent_comment_id)
- [ ] Mentions support

#### Attachments
- [x] `attachments` table - Schema defined
- [ ] File upload functionality
- [ ] List attachments by entity
- [ ] Delete attachment
- [ ] Storage bucket configuration
- [ ] Thumbnail generation

#### Organizations
- [x] `organizations` table - Schema defined
- [x] Basic organization hooks
- [ ] Create organization UI
- [ ] Organization member management
- [ ] Organization settings
- [ ] Organization projects view

#### Notifications
- [x] `notifications` table - Integrated
- [x] List notifications
- [x] Mark as read
- [x] Unread count
- [ ] Notification preferences
- [ ] Real-time notification updates

#### Activity Logs
- [x] `activity_logs` table - Schema defined
- [x] Auto-logging via triggers
- [ ] Activity log viewer UI
- [ ] Activity log filtering

#### Other Tables
- [ ] `webhooks` - Organization webhooks
- [ ] `api_keys` - API key management
- [ ] `sessions` - Session tracking
- [ ] `tags` - Tag management
- [ ] `cache` - Cache operations (via functions)

### ✅ Database Functions Integration

#### Helper Functions
- [ ] `is_project_member()` - Check project access
- [ ] `get_user_role_in_project()` - Get user role
- [ ] `get_user_role_in_org()` - Get org role
- [ ] `generate_unique_slug()` - Slug generation
- [ ] `log_activity()` - Manual activity logging
- [ ] `create_notification()` - Create notifications

#### Cache Functions
- [ ] `cache_get()` - Get cached value
- [ ] `cache_set()` - Set cached value
- [ ] `cache_invalidate()` - Invalidate key
- [ ] `cache_invalidate_by_tag()` - Invalidate by tag

#### Utility Functions
- [ ] `cleanup_expired_sessions()` - Session cleanup
- [ ] `refresh_project_stats()` - Refresh materialized view
- [ ] `acquire_vault_lock()` - Concurrency control
- [ ] `release_vault_lock()` - Release lock

### ✅ Real-time Features
- [x] Realtime subscription hook structure
- [ ] Projects realtime updates
- [ ] Tasks realtime updates
- [ ] Comments realtime updates
- [ ] Notifications realtime updates

### ✅ Security & Permissions
- [x] RLS policies defined in database
- [x] Auth context provides user ID
- [ ] Test RLS policies
- [ ] Organization member permissions
- [ ] Project access control UI

### 📝 Documentation Needed
- [ ] Database setup guide
- [ ] Environment variables documentation
- [ ] API documentation for hooks
- [ ] Database migration guide

## Next Steps

1. **Complete Comments Integration**
   - Add comment hooks to `useSupabase.ts`
   - Integrate chat UI into VaultWorkspace
   - Add real-time comment updates

2. **Enhance Task Management**
   - Add task assignment UI
   - Implement task dependencies
   - Add task progress visualization

3. **File Upload System**
   - Configure Supabase Storage buckets
   - Create attachment upload hooks
   - Add file upload UI components

4. **Organization Features**
   - Create organization management UI
   - Add member invitation system
   - Implement organization settings

5. **Performance Optimization**
   - Use materialized views for project stats
   - Implement caching for frequently accessed data
   - Add pagination for large lists

## Database Setup Instructions

1. **Supabase Setup**
   - Create a new Supabase project
   - Copy environment variables to `.env`:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

2. **Run SQL Files in Order**
   - Open Supabase SQL Editor
   - Execute files in this order:
     1. `database/schema.sql`
     2. `database/functions.sql`
     3. `database/triggers.sql`
     4. `database/rls_policies.sql`
     5. `database/caching.sql`
     6. `database/edge_cases.sql`

3. **Storage Setup**
   - Create storage bucket: `attachments`
   - Set up RLS policies for storage
   - Configure CORS if needed

4. **Verify Setup**
   - Test user registration
   - Create a test vault
   - Verify triggers are working
   - Check RLS policies

## Notes

- All database operations should go through the hooks in `useSupabase.ts`
- Use TypeScript types from `database.types.ts` for type safety
- RLS policies handle most security automatically
- Triggers handle automatic operations (user creation, audit logs, etc.)
- Use database functions for complex operations rather than client-side logic
