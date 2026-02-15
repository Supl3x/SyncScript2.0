# Email Configuration Steps

This guide will help you set up email notifications for collaborator invitations.

## Prerequisites

1. A Gmail account (or willingness to create one for the app)
2. Supabase CLI installed
3. Your Supabase project reference ID

---

## Step 1: Get Gmail App Password

### Why App Password?
Gmail requires App Passwords for third-party applications to send emails via SMTP. Your regular Gmail password won't work.

### Steps:

1. **Enable 2-Factor Authentication (if not already enabled):**
   - Go to https://myaccount.google.com/security
   - Click on "2-Step Verification"
   - Follow the setup process

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Or: Google Account → Security → 2-Step Verification → App passwords
   - Select "Mail" as the app
   - Select "Other" as the device and name it "SyncScript"
   - Click "Generate"
   - **Copy the 16-character password** (it will look like: `abcd efgh ijkl mnop`)
   - **Important:** Remove the spaces when using it: `abcdefghijklmnop`

---

## Step 2: Install Supabase CLI

### Windows:
```powershell
# Using npm (recommended)
npm install -g supabase

# Or using Scoop
scoop install supabase
```

### Mac:
```bash
# Using Homebrew
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### Linux:
```bash
# Using npm
npm install -g supabase

# Or download binary
curl -L https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
```

### Verify Installation:
```bash
supabase --version
```

---

## Step 3: Link Your Supabase Project

1. **Get your Project Reference ID:**
   - Go to your Supabase Dashboard
   - Click on your project
   - Go to Settings → General
   - Copy the "Reference ID" (looks like: `abcdefghijklmnop`)

2. **Link the project:**
   ```bash
   cd SyncScript
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   
3. **Enter your database password when prompted**
   - This is the password you set when creating the Supabase project
   - Not your Supabase account password

---

## Step 4: Set Environment Secrets

Run these commands in your terminal (in the SyncScript directory):

```bash
# Set Gmail user (your Gmail address)
supabase secrets set GMAIL_USER=your-email@gmail.com

# Set Gmail App Password (the 16-character password from Step 1, no spaces)
supabase secrets set GMAIL_APP_PASSWORD=abcdefghijklmnop

# Set your app URL (use your actual deployed URL or localhost for testing)
supabase secrets set APP_URL=https://your-app-url.com
# For local testing: supabase secrets set APP_URL=http://localhost:5173
```

### Verify Secrets:
```bash
supabase secrets list
```

You should see:
```
GMAIL_USER
GMAIL_APP_PASSWORD
APP_URL
```

---

## Step 5: Deploy the Edge Function

```bash
cd SyncScript
supabase functions deploy send-collaboration-email
```

### Expected Output:
```
Deploying send-collaboration-email (project ref: your-project-ref)
Bundled send-collaboration-email in XXXms
Deployed send-collaboration-email in XXXms
```

### Verify Deployment:
```bash
supabase functions list
```

You should see `send-collaboration-email` in the list.

---

## Step 6: Test the Email Function

### Option A: Test from Browser Console

1. Open your app in the browser
2. Open DevTools (F12) → Console
3. Run this code:

```javascript
const { data, error } = await supabase.functions.invoke('send-collaboration-email', {
  body: {
    to: 'your-test-email@example.com',
    subject: 'Test Email from SyncScript',
    project_name: 'Test Project',
    inviter_name: 'Test User',
    project_id: 'test-uuid-123'
  }
});

console.log('Result:', { data, error });
```

### Option B: Test by Adding a Collaborator

1. Create a project/vault
2. Click "Share" button
3. Enter an email of a registered user
4. Click "Invite"
5. Check the email inbox

### Check Logs:
```bash
supabase functions logs send-collaboration-email
```

---

## Troubleshooting

### Error: "Gmail SMTP not configured"
**Cause:** Secrets are not set or not accessible by the function.

**Solution:**
1. Verify secrets are set: `supabase secrets list`
2. Redeploy the function: `supabase functions deploy send-collaboration-email`

---

### Error: "Authentication failed" or "Invalid credentials"
**Cause:** Gmail App Password is incorrect or has spaces.

**Solution:**
1. Generate a new App Password
2. Remove all spaces from the password
3. Set the secret again:
   ```bash
   supabase secrets set GMAIL_APP_PASSWORD=yournewpassword
   ```
4. Redeploy the function

---

### Error: "Less secure app access"
**Cause:** You're trying to use your regular Gmail password instead of an App Password.

**Solution:**
- Use an App Password (see Step 1)
- Never use your regular Gmail password

---

### Emails not arriving
**Possible Causes:**
1. Check spam/junk folder
2. Gmail might be rate-limiting (wait a few minutes)
3. Check function logs for errors: `supabase functions logs send-collaboration-email`

**Solution:**
1. Check logs for specific error messages
2. Verify the recipient email is correct
3. Try sending to a different email address
4. Check Gmail account for any security alerts

---

### Function not found
**Cause:** Edge Function is not deployed.

**Solution:**
```bash
supabase functions deploy send-collaboration-email
```

---

## Alternative: Using Resend (Recommended for Production)

If you prefer a dedicated email service instead of Gmail:

### 1. Sign up for Resend:
- Go to https://resend.com
- Create an account (free tier available)
- Get your API key

### 2. Update the Edge Function:

Edit `SyncScript/supabase/functions/send-collaboration-email/index.ts`:

```typescript
// Replace the Gmail SMTP code with Resend API
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const response = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${RESEND_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "SyncScript <onboarding@resend.dev>",
    to: [to],
    subject: subject,
    html: emailHtml,
  }),
});
```

### 3. Set Resend secrets:
```bash
supabase secrets set RESEND_API_KEY=re_your_api_key
supabase secrets set APP_URL=https://your-app-url.com
```

### 4. Deploy:
```bash
supabase functions deploy send-collaboration-email
```

---

## Security Notes

1. **Never commit secrets to Git**
   - Secrets are stored in Supabase, not in your code
   - The `.env` file should be in `.gitignore`

2. **App Passwords are safer than regular passwords**
   - They can be revoked without changing your Gmail password
   - They only have access to send emails, not read them

3. **Use environment-specific URLs**
   - Development: `http://localhost:5173`
   - Production: Your actual domain

---

## Quick Reference

### Check if everything is configured:
```bash
# Check secrets
supabase secrets list

# Check functions
supabase functions list

# Check logs
supabase functions logs send-collaboration-email

# Test function
supabase functions invoke send-collaboration-email --body '{"to":"test@example.com","subject":"Test","project_name":"Test","inviter_name":"Test","project_id":"test"}'
```

---

## Need More Help?

1. Check Supabase Edge Functions documentation: https://supabase.com/docs/guides/functions
2. Check Gmail App Passwords help: https://support.google.com/accounts/answer/185833
3. Check the function logs for specific error messages
4. Verify all secrets are set correctly
5. Make sure 2FA is enabled on your Gmail account
