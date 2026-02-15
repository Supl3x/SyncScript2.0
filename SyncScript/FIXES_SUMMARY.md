# SyncScript Fixes Summary

## 1. PDF and Word Document Viewer ✅ COMPLETED

### What was fixed:
- Created a comprehensive `FileViewer` component that handles:
  - PDF files with zoom, pagination, and download
  - Word documents (.doc, .docx) using Microsoft Office Online Viewer
  - Image files with preview
  - Fallback for unsupported file types

### Files modified:
- `SyncScript/src/components/FileViewer.tsx` - NEW FILE
- `SyncScript/src/pages/VaultWorkspace.tsx` - Updated to use FileViewer
- `SyncScript/package.json` - Added react-pdf and pdfjs-dist dependencies

### How it works:
- When a user clicks on a file in the vault sidebar, it now opens in the center panel
- PDFs are rendered with full controls (zoom, page navigation)
- Word documents are displayed using Microsoft's online viewer
- All files have a download button

### Testing:
1. Upload a PDF file to a vault
2. Click on it in the sidebar
3. It should display with zoom and page controls
4. Upload a Word document (.docx)
5. Click on it - it should display using Office Online viewer

---

## 2. Collaborator Email Notifications ⚠️ NEEDS CONFIGURATION

### Current Status:
The code is properly set up, but email sending requires configuration of environment variables.

### What's in place:
1. Database function `notify_collaborator_added` exists in `project_collaborators.sql`
2. Edge Function `send-collaboration-email` exists and uses Gmail SMTP
3. Frontend code properly calls both the database function and Edge Function
4. RLS policies are correctly configured

### What needs to be done:

#### Option A: Gmail SMTP (Current Implementation)
1. **Get Gmail App Password:**
   - Go to Google Account → Security
   - Enable 2-Factor Authentication
   - Go to App Passwords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

2. **Set Supabase Secrets:**
   ```bash
   # Install Supabase CLI if not installed
   npm install -g supabase
   
   # Link your project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Set secrets
   supabase secrets set GMAIL_USER=your-email@gmail.com
   supabase secrets set GMAIL_APP_PASSWORD=your-16-char-app-password
   supabase secrets set APP_URL=https://your-app-url.com
   ```

3. **Deploy Edge Function:**
   ```bash
   cd SyncScript
   supabase functions deploy send-collaboration-email
   ```

#### Option B: Use Resend (Recommended Alternative)
If Gmail doesn't work or you prefer a dedicated email service:

1. Sign up at [resend.com](https://resend.com)
2. Get API key
3. Update the Edge Function to use Resend instead of Gmail SMTP
4. Set secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
   supabase secrets set APP_URL=https://your-app-url.com
   ```

### Files involved:
- `SyncScript/supabase/functions/send-collaboration-email/index.ts` - Email sending logic
- `SyncScript/database/project_collaborators.sql` - Database function
- `SyncScript/src/hooks/useSupabaseExtended.ts` - Frontend hook that calls both functions

### Testing after configuration:
1. Add a collaborator to a project
2. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs send-collaboration-email
   ```
3. The collaborator should receive an email
4. Check the notifications table in database for the notification record

---

## 3. Collaborators Not Showing Up ⚠️ NEEDS INVESTIGATION

### Potential Issues:
1. **RLS Policies** - Check if policies are blocking reads
2. **Real-time subscription** - Verify it's working
3. **Query logic** - The hook combines direct collaborators and org members

### Debug Steps:

1. **Check if collaborator was added to database:**
   ```sql
   SELECT * FROM project_collaborators WHERE project_id = 'YOUR_PROJECT_ID';
   ```

2. **Check RLS policies:**
   - The policies look correct in `project_collaborators.sql`
   - User should be able to see collaborators if they own the project or are a collaborator

3. **Check browser console:**
   - Look for any errors when adding collaborators
   - Check network tab for failed requests

4. **Verify the query in useProjectCollaborators:**
   - Open browser dev tools
   - Check the Supabase query being made
   - Verify the response

### Quick Fix to Test:
Add some console logging to debug:

```typescript
// In SyncScript/src/hooks/useSupabaseExtended.ts
// Add console.log in useProjectCollaborators:

export const useProjectCollaborators = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['collaborators', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('Fetching collaborators for project:', projectId);
      
      const { data: collaborators, error: collabError } = await supabase
        .from('project_collaborators')
        .select(`
          *,
          user:users(id, full_name, email, avatar_url, username)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true);
      
      console.log('Collaborators result:', collaborators, collabError);
      
      // ... rest of the function
    },
    enabled: !!projectId,
  });
};
```

---

## Next Steps:

1. ✅ PDF/Word viewer is complete and should work immediately
2. ⚠️ Configure email secrets and deploy Edge Function for email notifications
3. ⚠️ Test collaborator addition and check browser console for errors
4. ⚠️ If collaborators still don't show, add debug logging and check database directly

## Files Created/Modified:

### New Files:
- `SyncScript/src/components/FileViewer.tsx`
- `SyncScript/database/notify_collaborator.sql`
- `SyncScript/FIXES_SUMMARY.md` (this file)

### Modified Files:
- `SyncScript/src/pages/VaultWorkspace.tsx`
- `SyncScript/package.json`

### Existing Files (No changes needed, but relevant):
- `SyncScript/supabase/functions/send-collaboration-email/index.ts`
- `SyncScript/database/project_collaborators.sql`
- `SyncScript/src/hooks/useSupabaseExtended.ts`
- `SyncScript/src/components/ManageAccessModal.tsx`
