# Testing Guide for Recent Fixes

## 1. Testing PDF/Word Document Viewer

### Prerequisites:
- Have a vault/project created
- Have some test files ready (PDF, DOCX, images)

### Steps:
1. Navigate to a vault workspace
2. Click the "Upload" button in the left sidebar
3. Upload a PDF file
4. Click on the uploaded PDF in the sidebar
5. **Expected Result:** 
   - PDF should display in the center panel
   - You should see zoom controls (+ and -)
   - You should see page navigation (< and >)
   - Current page number should be displayed
   - Download button should be visible

6. Upload a Word document (.docx)
7. Click on the Word document
8. **Expected Result:**
   - Document should display using Microsoft Office Online Viewer
   - Download button should be visible

9. Upload an image file (JPG, PNG)
10. Click on the image
11. **Expected Result:**
    - Image should display with proper sizing
    - Download button should be visible

### Troubleshooting:
- If PDF doesn't load: Check browser console for errors
- If Word doc doesn't load: Ensure the file URL is publicly accessible
- If nothing displays: Check that the file was uploaded successfully to Supabase Storage

---

## 2. Testing Collaborator Addition (With Debug Logging)

### Prerequisites:
- Have at least 2 user accounts registered
- Be logged in as the project owner
- Have a project/vault created

### Steps:
1. Open a vault workspace
2. Click the "Share" button in the top right
3. **Open browser DevTools (F12) and go to Console tab**
4. In the "Invite New Researcher" section, enter the email of another registered user
5. Click "Invite"
6. **Check the console for debug logs:**
   - Look for `[DEBUG] Adding collaborator:` - shows the request
   - Look for `[DEBUG] User lookup result:` - shows if user was found
   - Look for `[DEBUG] Inserting new collaborator` or `[DEBUG] Updating existing collaborator`
   - Look for any error messages

7. **Expected Result:**
   - Toast notification: "Collaborator added"
   - The user should appear in the "Researchers" section
   - Console should show successful debug logs

### If Collaborator Doesn't Appear:

#### Check 1: Was the user found?
Look for this in console:
```
[DEBUG] User lookup result: { user: { id: '...', email: '...', full_name: '...' }, userError: null }
```
- If `user` is null: The email doesn't exist in the database
- If `userError` is not null: There's a database error

#### Check 2: Was the insert successful?
Look for:
```
[DEBUG] Inserting new collaborator
```
Followed by either success or an error message.

#### Check 3: Is the query returning data?
Look for:
```
[DEBUG] Fetching collaborators for project: <project-id>
[DEBUG] Collaborators query result: { collaborators: [...], collabError: null }
[DEBUG] Final unique members: [...]
```

#### Check 4: Database Direct Check
Open Supabase Dashboard → SQL Editor and run:
```sql
SELECT * FROM project_collaborators 
WHERE project_id = 'YOUR_PROJECT_ID' 
AND is_active = true;
```

#### Check 5: RLS Policy Check
Run this to see if RLS is blocking:
```sql
-- Temporarily disable RLS to test (DO NOT DO THIS IN PRODUCTION)
ALTER TABLE project_collaborators DISABLE ROW LEVEL SECURITY;

-- Try the query again, then re-enable:
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;
```

### Common Issues:

1. **"No user exists with that email"**
   - The email is not registered in your app
   - Solution: Register the user first

2. **Collaborator added but doesn't show up**
   - RLS policy might be blocking the read
   - Check console for `[DEBUG] Collaborators query result`
   - If `collaborators` is empty but no error, it's likely RLS

3. **"Failed to add collaborator"**
   - Check the error message in console
   - Could be a unique constraint violation (user already added)
   - Could be a foreign key violation (project doesn't exist)

---

## 3. Testing Email Notifications

### Prerequisites:
- Supabase Edge Function must be deployed
- Environment variables must be set (GMAIL_USER, GMAIL_APP_PASSWORD, APP_URL)

### Steps:
1. Add a collaborator (follow steps above)
2. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs send-collaboration-email --project-ref YOUR_PROJECT_REF
   ```
3. Check the collaborator's email inbox
4. **Expected Result:**
   - Email should arrive within a few minutes
   - Email should contain project name and inviter name
   - Email should have a link to the project

### If Email Doesn't Send:

#### Check 1: Are secrets set?
```bash
supabase secrets list --project-ref YOUR_PROJECT_REF
```
Should show: GMAIL_USER, GMAIL_APP_PASSWORD, APP_URL

#### Check 2: Is function deployed?
```bash
supabase functions list --project-ref YOUR_PROJECT_REF
```
Should show: send-collaboration-email

#### Check 3: Check function logs
```bash
supabase functions logs send-collaboration-email --project-ref YOUR_PROJECT_REF
```
Look for error messages

#### Check 4: Test function directly
In browser console:
```javascript
const { data, error } = await supabase.functions.invoke('send-collaboration-email', {
  body: {
    to: 'test@example.com',
    subject: 'Test Email',
    project_name: 'Test Project',
    inviter_name: 'Test User',
    project_id: 'test-uuid'
  }
});
console.log({ data, error });
```

### Common Issues:

1. **"Gmail SMTP not configured"**
   - Secrets are not set
   - Solution: Set GMAIL_USER and GMAIL_APP_PASSWORD secrets

2. **"Authentication failed"**
   - Gmail App Password is incorrect
   - Solution: Generate a new App Password in Google Account settings

3. **"Function not found"**
   - Edge Function is not deployed
   - Solution: Deploy with `supabase functions deploy send-collaboration-email`

---

## Quick Checklist

### PDF/Word Viewer:
- [ ] PDF files display correctly
- [ ] Zoom controls work
- [ ] Page navigation works
- [ ] Word documents display
- [ ] Download button works
- [ ] Images display

### Collaborators:
- [ ] Can add collaborator by email
- [ ] Collaborator appears in list immediately
- [ ] Can change collaborator role
- [ ] Can remove collaborator
- [ ] Real-time updates work (test with 2 browsers)
- [ ] Debug logs show in console

### Email Notifications:
- [ ] Secrets are configured
- [ ] Edge Function is deployed
- [ ] Email arrives in inbox
- [ ] Email content is correct
- [ ] Link in email works

---

## Need Help?

1. Check `FIXES_SUMMARY.md` for detailed information about what was fixed
2. Check browser console for debug logs (look for `[DEBUG]` prefix)
3. Check Supabase logs for database and Edge Function errors
4. Check network tab in DevTools for failed API calls
