# Email Setup Guide

This guide explains how to set up email notifications for collaboration invites.

## Option 1: Using Supabase Edge Functions + Resend (Recommended)

### Step 1: Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys section
3. Create a new API key
4. Copy the key

### Step 2: Deploy Edge Function

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Find your project ref in Supabase dashboard → Settings → General)

3. Set secrets:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
   supabase secrets set APP_URL=https://your-app-domain.com
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy send-collaboration-email
   ```

### Step 3: Verify

The function will automatically be called when collaborators are added. Test by adding a collaborator to a project.

## Option 2: Using Supabase Built-in Email (Simpler but Limited)

If you don't want to use Resend, you can modify the database function to use Supabase's built-in email service. However, this requires configuring SMTP in your Supabase project settings.

1. Go to Supabase Dashboard → Settings → Auth → SMTP Settings
2. Configure your SMTP server
3. The database function will automatically use it

## Option 3: Manual Email Service Integration

You can integrate any email service (SendGrid, Mailgun, etc.) by:

1. Creating an Edge Function similar to `send-collaboration-email`
2. Updating the API calls in the function
3. Setting the appropriate API keys as secrets

## Troubleshooting

### Emails not sending?

1. Check Edge Function logs:
   ```bash
   supabase functions logs send-collaboration-email
   ```

2. Verify secrets are set:
   ```bash
   supabase secrets list
   ```

3. Check Resend dashboard for delivery status

### Function not being called?

1. Verify the function is deployed:
   ```bash
   supabase functions list
   ```

2. Check database function `notify_collaborator_added` is working
3. Check browser console for errors

## Testing

To test email sending manually:

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
