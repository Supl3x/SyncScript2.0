/**
 * Custom hooks for Supabase database operations
 * These hooks use TanStack Query for caching and state management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { 
  Project, 
  ProjectInsert, 
  ProjectUpdate,
  Task,
  TaskInsert,
  TaskUpdate,
  Notification,
  Organization 
} from '@/lib/database.types';
import { useAuth } from '@/contexts/AuthContext';

// ===== PROJECTS =====

export const useProjects = (organizationId?: string) => {
  const { user, loading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ['projects', organizationId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('projects')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      return (data || []) as Project[];
    },
    enabled: !authLoading && !!user,
    retry: 1,
  });
};

export const useProject = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (project: ProjectInsert) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProjectUpdate }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

// ===== TASKS =====

export const useTasks = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId,
  });
};

export const useTask = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();
      
      if (error) throw error;
      return data as Task;
    },
    enabled: !!taskId,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdate }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', data.project_id] });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
  });
};

// ===== NOTIFICATIONS =====

export const useNotifications = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useUnreadNotificationCount = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// ===== ORGANIZATIONS =====

export const useOrganizations = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get organizations where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);
      
      if (memberError) throw memberError;
      
      const orgIds = memberData.map(m => m.organization_id);
      
      if (orgIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Organization[];
    },
    enabled: !!user,
  });
};

// ===== DATABASE FUNCTIONS =====

/**
 * Check if user is a member of a project
 */
export const useIsProjectMember = (projectId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['is-project-member', projectId, user?.id],
    queryFn: async () => {
      if (!projectId || !user) return false;
      
      const { data, error } = await supabase.rpc('is_project_member', {
        p_project_id: projectId,
        p_user_id: user.id,
      });
      
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!projectId && !!user,
  });
};

/**
 * Get user's role in a project
 */
export const useUserRoleInProject = (projectId: string | undefined) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['user-role-project', projectId, user?.id],
    queryFn: async () => {
      if (!projectId || !user) return null;
      
      const { data, error } = await supabase.rpc('get_user_role_in_project', {
        p_project_id: projectId,
        p_user_id: user.id,
      });
      
      if (error) throw error;
      return data as string | null;
    },
    enabled: !!projectId && !!user,
  });
};

/**
 * Generate a unique slug for a project
 */
export const useGenerateSlug = () => {
  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc('generate_unique_slug', {
        p_name: name,
        p_table: 'projects',
      });
      
      if (error) throw error;
      return data as string;
    },
  });
};

// ===== REALTIME SUBSCRIPTIONS =====

export const useRealtimeSubscription = (
  table: string,
  filter?: { column: string; value: string },
  onUpdate?: (payload: any) => void
) => {
  const queryClient = useQueryClient();
  
  useQuery({
    queryKey: ['realtime', table, filter],
    queryFn: async () => {
      let channel = supabase.channel(`${table}-changes`);
      
      if (filter) {
        channel = channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `${filter.column}=eq.${filter.value}`,
          },
          (payload) => {
            console.log('Realtime update:', payload);
            queryClient.invalidateQueries({ queryKey: [table] });
            onUpdate?.(payload);
          }
        );
      } else {
        channel = channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
          },
          (payload) => {
            console.log('Realtime update:', payload);
            queryClient.invalidateQueries({ queryKey: [table] });
            onUpdate?.(payload);
          }
        );
      }
      
      channel.subscribe();
      
      return () => {
        channel.unsubscribe();
      };
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
