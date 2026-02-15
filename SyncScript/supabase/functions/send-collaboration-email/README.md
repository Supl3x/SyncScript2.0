# Send Collaboration Email Edge Function (Gmail SMTP)

This Supabase Edge Function sends email notifications when a user is added as a collaborator to a project using Gmail SMTP.

## Setup

### 1. Get Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable it if not already enabled)
3. Go to **App passwords**: https://myaccount.google.com/apppasswords
4. Select **Mail** and **Other (Custom name)**
5. Enter "SyncScript" as the name
6. Click **Generate**
7. Copy the 16-character app password (you'll need this)

### 2. Install Supabase CLI

```bash
npm install -g supabase
```

### 3. Link your project

```bash
supabase link --project-ref your-project-ref
```

(Find your project ref in Supabase dashboard → Settings → General)

### 4. Set Gmail credentials as secrets

```bash
# Your Gmail address
supabase secrets set GMAIL_USER=your-email@gmail.com

# Your Gmail App Password (16 characters, no spaces)
supabase secrets set GMAIL_APP_PASSWORD=your-16-char-app-password

# Your app URL
supabase secrets set APP_URL=https://your-app-domain.com
```

**Important**: 
- Use your full Gmail address (e.g., `yourname@gmail.com`)
- Use the 16-character App Password (not your regular Gmail password)
- The App Password will look like: `abcd efgh ijkl mnop` (enter it without spaces: `abcdefghijklmnop`)

### 5. Deploy the function

```bash
supabase functions deploy send-collaboration-email
```

### 6. Verify deployment

```bash
supabase functions list
```

You should see `send-collaboration-email` in the list.

## Testing

To test the function manually:

```typescript
const { data, error } = await supabase.functions.invoke('send-collaboration-email', {
  body: {
    to: 'test@example.com',
    subject: 'Test Email',
    project_name: 'Test Project',
    inviter_name: 'Test User',
    project_id: 'test-uuid'
  }
});
```

## Troubleshooting

### Email not sending?

1. **Check secrets are set:**
   ```bash
   supabase secrets list
   ```

2. **Check function logs:**
   ```bash
   supabase functions logs send-collaboration-email
   ```

3. **Verify Gmail App Password:**
   - Make sure you're using the App Password, not your regular password
   - Ensure 2-Step Verification is enabled
   - The password should be exactly 16 characters

4. **Common errors:**
   - `535 Authentication failed`: Wrong App Password or Gmail address
   - `Connection timeout`: Check firewall/network settings
   - `Function not found`: Make sure the function is deployed

### Security Notes

- Never commit your Gmail App Password to git
- Use Supabase secrets for all sensitive credentials
- The App Password is specific to this application and can be revoked anytime
- If compromised, revoke the App Password and generate a new one

## Alternative: Using Supabase Built-in Email

If you prefer not to use Gmail SMTP, you can configure Supabase's built-in email service:

1. Go to Supabase Dashboard → Settings → Auth → SMTP Settings
2. Configure your SMTP server
3. The database function will automatically use it
