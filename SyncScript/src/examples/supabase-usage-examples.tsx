/**
 * Example Usage Guide for Supabase Integration
 * Copy and adapt these examples into your pages
 */

// ========================================
// EXAMPLE 1: Login Page
// ========================================
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const LoginExample = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the page they were trying to visit, or default to dashboard
  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error('Login failed', {
        description: error.message,
      });
    } else {
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
};

// ========================================
// EXAMPLE 2: Register Page
// ========================================
export const RegisterExample = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signUp(email, password, {
      full_name: fullName,
      username: username,
    });

    if (error) {
      toast.error('Registration failed', {
        description: error.message,
      });
    } else {
      toast.success('Account created!', {
        description: 'Please check your email to verify your account.',
      });
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <Input
        type="text"
        placeholder="Full Name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />
      <Input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </Button>
    </form>
  );
};

// ========================================
// EXAMPLE 3: User Profile Display
// ========================================
export const UserProfileExample = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <h2>Welcome, {profile?.full_name || profile?.email}!</h2>
      <div className="text-sm text-muted-foreground">
        <p>Email: {profile?.email}</p>
        <p>Username: {profile?.username}</p>
        <p>Role: {profile?.role}</p>
      </div>
      <Button onClick={handleLogout} variant="outline">
        Sign Out
      </Button>
    </div>
  );
};

// ========================================
// EXAMPLE 4: Working with Projects
// ========================================
import { useProjects, useCreateProject } from '@/hooks/useSupabase';

export const ProjectsExample = () => {
  const { data: projects, isLoading } = useProjects();
  const { mutate: createProject } = useCreateProject();

  const handleCreateProject = () => {
    createProject({
      name: 'My New Project',
      slug: 'my-new-project',
      description: 'A great new project',
      visibility: 'private',
    });
  };

  if (isLoading) return <div>Loading projects...</div>;

  return (
    <div>
      <Button onClick={handleCreateProject}>Create Project</Button>
      <div className="grid gap-4 mt-4">
        {projects?.map((project) => (
          <div key={project.id} className="p-4 border rounded">
            <h3>{project.name}</h3>
            <p>{project.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ========================================
// EXAMPLE 5: Protected Route in App.tsx
// ========================================
import { ProtectedRoute } from '@/components/ProtectedRoute';

// In your Routes:
// <Route 
//   path="/dashboard" 
//   element={
//     <ProtectedRoute>
//       <DashboardLayout />
//     </ProtectedRoute>
//   }
// >
//   {/* child routes */}
// </Route>

// ========================================
// EXAMPLE 6: Notifications
// ========================================
import { useNotifications, useUnreadNotificationCount } from '@/hooks/useSupabase';

export const NotificationsExample = () => {
  const { data: notifications } = useNotifications();
  const { data: unreadCount } = useUnreadNotificationCount();

  return (
    <div>
      <h3>Notifications ({unreadCount})</h3>
      {notifications?.map((notif) => (
        <div key={notif.id} className={notif.read ? 'opacity-50' : ''}>
          <strong>{notif.title}</strong>
          <p>{notif.message}</p>
        </div>
      ))}
    </div>
  );
};

// ========================================
// EXAMPLE 7: Realtime Updates
// ========================================
import { useRealtimeSubscription } from '@/hooks/useSupabase';

export const RealtimeExample = () => {
  const { user } = useAuth();
  
  // Subscribe to task updates for current user
  useRealtimeSubscription(
    'tasks',
    user ? { column: 'assigned_to', value: user.id } : undefined,
    (payload) => {
      console.log('Task updated:', payload);
      toast.info('Task updated!');
    }
  );

  return <div>Listening to realtime updates...</div>;
};

// ========================================
// EXAMPLE 8: Direct Supabase Queries
// ========================================
import { supabase } from '@/lib/supabase';

export const CustomQueryExample = async () => {
  // Fetch user's organizations
  const { data: orgs, error } = await supabase
    .from('organization_members')
    .select(`
      organization_id,
      organizations (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', 'user-id-here');

  if (error) {
    console.error('Error:', error);
    return;
  }

  return orgs;
};

// ========================================
// EXAMPLE 9: File Upload
// ========================================
export const FileUploadExample = async (file: File, userId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Math.random()}.${fileExt}`;

  // Upload file to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(fileName, file);

  if (uploadError) {
    toast.error('Upload failed', { description: uploadError.message });
    return;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('attachments')
    .getPublicUrl(fileName);

  // Save attachment record to database
  const { error: dbError } = await supabase
    .from('attachments')
    .insert({
      file_name: file.name,
      file_path: publicUrl,
      file_size: file.size,
      file_type: file.type,
      mime_type: file.type,
      storage_bucket: 'attachments',
      storage_path: fileName,
      uploaded_by: userId,
    });

  if (dbError) {
    toast.error('Failed to save attachment', { description: dbError.message });
    return;
  }

  toast.success('File uploaded successfully!');
  return publicUrl;
};
