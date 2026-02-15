# Send Collaboration Email Edge Function

This Supabase Edge Function sends email notifications when a user is added as a collaborator to a project.

## Setup

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Link your project
```bash
supabase link --project-ref your-project-ref
```

### 3. Set up Resend API Key
```bash
# Get your API key from https://resend.com/api-keys
supabase secrets set RESEND_API_KEY=your-resend-api-key
supabase secrets set APP_URL=https://your-app-domain.com
```

### 4. Deploy
```bash
supabase functions deploy send-collaboration-email
```

## Alternative: Use Supabase Built-in Email

If you don't want to use Resend, you can use Supabase's built-in email service by modifying the function to use the Supabase client's email methods.

## Usage

The function is automatically called by the database trigger when a collaborator is added. You can also call it manually:

```typescript
const { data, error } = await supabase.functions.invoke('send-collaboration-email', {
  body: {
    to: 'user@example.com',
    subject: 'You have been added to a project',
    project_name: 'My Project',
    inviter_name: 'John Doe',
    project_id: 'project-uuid'
  }
});
```
