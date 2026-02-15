# Database Setup Guide

This guide will help you set up the SyncScript database in Supabase.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- A new Supabase project created

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: SyncScript (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Get Environment Variables

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (this is your `VITE_SUPABASE_URL`)
   - **anon public** key (this is your `VITE_SUPABASE_ANON_KEY`)

3. Create a `.env` file in the root of your project:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Execute the SQL files in this exact order:

### 3.1 Schema (Core Tables)
- Open `database/schema.sql`
- Copy all contents
- Paste into SQL Editor
- Click "Run" (or press Ctrl+Enter)
- Wait for success message

### 3.2 Functions (Helper Functions)
- Open `database/functions.sql`
- Copy all contents
- Paste into SQL Editor
- Click "Run"
- Verify success

### 3.3 Triggers (Automatic Operations)
- Open `database/triggers.sql`
- Copy all contents
- Paste into SQL Editor
- Click "Run"
- Verify success

### 3.4 RLS Policies (Security)
- Open `database/rls_policies.sql`
- Copy all contents
- Paste into SQL Editor
- Click "Run"
- Verify success

### 3.5 Caching (Performance)
- Open `database/caching.sql`
- Copy all contents
- Paste into SQL Editor
- Click "Run"
- Verify success

### 3.6 Edge Cases (Integrity)
- Open `database/edge_cases.sql`
- Copy all contents
- Paste into SQL Editor
- Click "Run"
- Verify success

## Step 4: Set Up Storage

1. In Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Configure:
   - **Name**: `attachments`
   - **Public bucket**: ✅ (checked)
   - **File size limit**: 50 MB (or your preference)
   - **Allowed MIME types**: Leave empty for all types
4. Click "Create bucket"

### 4.1 Storage RLS Policies

Go to **Storage** → **Policies** → `attachments` bucket, and add:

**Policy 1: Allow authenticated users to upload**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');
```

**Policy 2: Allow authenticated users to read**
```sql
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attachments');
```

**Policy 3: Allow users to delete their own files**
```sql
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Step 5: Verify Setup

### 5.1 Check Tables
1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables:
   - `users`
   - `user_profiles`
   - `organizations`
   - `organization_members`
   - `projects`
   - `tasks`
   - `comments`
   - `attachments`
   - `activity_logs`
   - `notifications`
   - `webhooks`
   - `api_keys`
   - `sessions`
   - `tags`
   - `cache`
   - `rate_limits`

### 5.2 Test User Registration
1. Start your app: `npm run dev`
2. Go to the registration page
3. Create a test account
4. Check in Supabase **Table Editor** → `users` table
5. Verify a row was created automatically (via trigger)

### 5.3 Test Project Creation
1. Log in to your app
2. Create a new vault
3. Check `projects` table in Supabase
4. Verify the project was created

## Step 6: (Optional) Enable Realtime

Realtime is already enabled for key tables via `schema.sql`. To verify:

1. Go to **Database** → **Replication** in Supabase
2. You should see these tables enabled:
   - `projects`
   - `tasks`
   - `comments`
   - `notifications`
   - `attachments`
   - `organization_members`

## Troubleshooting

### Error: "relation does not exist"
- Make sure you ran `schema.sql` first
- Check that all tables were created in the `public` schema

### Error: "function does not exist"
- Make sure you ran `functions.sql` after `schema.sql`
- Check the function exists in **Database** → **Functions**

### Error: "permission denied"
- Make sure you ran `rls_policies.sql`
- Check RLS is enabled on the table: **Table Editor** → Select table → **Settings** → **Enable RLS**

### User profile not created on signup
- Check that `triggers.sql` was run
- Verify the trigger exists: **Database** → **Triggers**
- Check Supabase logs for errors

### Storage upload fails
- Verify the `attachments` bucket exists
- Check storage RLS policies are set up
- Ensure the bucket is public (or policies allow access)

## Database Maintenance

### Cleanup Expired Cache
Run periodically (or set up a cron job):
```sql
SELECT public.cache_cleanup();
```

### Cleanup Expired Sessions
```sql
SELECT public.cleanup_expired_sessions();
```

### Refresh Project Stats
```sql
SELECT public.refresh_project_stats();
```

### Cleanup Rate Limits
```sql
SELECT public.cleanup_rate_limits();
```

## Next Steps

- Review the [Database Integration Checklist](./DATABASE_INTEGRATION_CHECKLIST.md)
- Test all features in your application
- Set up database backups (Supabase Pro)
- Configure email templates for auth (Supabase Dashboard → Authentication → Email Templates)

## Support

If you encounter issues:
1. Check Supabase logs: **Logs** → **Postgres Logs**
2. Review error messages in browser console
3. Verify all SQL files were executed successfully
4. Check that environment variables are set correctly
