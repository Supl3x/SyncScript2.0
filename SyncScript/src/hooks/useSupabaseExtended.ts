/**
 * Extended Supabase hooks for all app features
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Comment, Attachment, CommentInsert } from '@/lib/database.types';

// ===== COMMENTS (Used for chat in vaults) =====

export const useComments = (entityType: string, entityId: string | undefined) => {
  return useQuery({
    queryKey: ['comments', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          user:users(id, full_name, email, avatar_url)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as (Comment & { user: any })[];
    },
    enabled: !!entityId,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (comment: CommentInsert) => {
      const { data, error } = await supabase
        .from('comments')
        .insert(comment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['comments', data.entity_type, data.entity_id] 
      });
    },
  });
};

// ===== ATTACHMENTS (Resources/Files) =====

export const useAttachments = (entityType: string | null, entityId: string | undefined) => {
  return useQuery({
    queryKey: ['attachments', entityType, entityId],
    queryFn: async () => {
      if (!entityId) return [];
      
      let query = supabase
        .from('attachments')
        .select('*')
        .eq('entity_id', entityId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!entityId,
  });
};

export const useCreateAttachment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attachment: any) => {
      const { data, error } = await supabase
        .from('attachments')
        .insert(attachment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments'] });
    },
  });
};

// ===== FAVORITES =====

export const useFavoriteProjects = () => {
  const { user, loading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ['projects', 'favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .contains('tags', ['favorite'])
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching favorite projects:', error);
        throw error;
      }
      return (data || []);
    },
    enabled: !authLoading && !!user,
    retry: 1,
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, isFavorite }: { projectId: string; isFavorite: boolean }) => {
      // Get current project
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('tags')
        .eq('id', projectId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const currentTags = project.tags || [];
      const newTags = isFavorite
        ? [...currentTags.filter((t: string) => t !== 'favorite'), 'favorite']
        : currentTags.filter((t: string) => t !== 'favorite');
      
      const { error } = await supabase
        .from('projects')
        .update({ tags: newTags })
        .eq('id', projectId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

// ===== SHARED PROJECTS (Organization Members) =====

export const useSharedProjects = () => {
  const { user, loading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ['shared-projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // Get organizations user is a member of
        const { data: memberships, error: memberError } = await supabase
          .from('organization_members')
          .select(`
            organization_id,
            role,
            organizations (
              id,
              name,
              projects (
                *,
                owner:users(id, full_name, email)
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (memberError) {
          console.error('Error fetching organization memberships:', memberError);
          throw memberError;
        }
        
        // Flatten projects from all organizations
        const projects: any[] = [];
        if (memberships) {
          memberships.forEach((membership: any) => {
            if (membership.organizations?.projects) {
              membership.organizations.projects.forEach((project: any) => {
                // Don't include projects user owns
                if (project.owner_id !== user.id && !project.deleted_at) {
                  projects.push({
                    ...project,
                    role: membership.role,
                    owner: project.owner || membership.organizations.projects[0]?.owner,
                  });
                }
              });
            }
          });
        }
        
        return projects;
      } catch (error) {
        console.error('Error in useSharedProjects:', error);
        return [];
      }
    },
    enabled: !authLoading && !!user,
    retry: 1,
  });
};

// ===== PROJECT COLLABORATORS =====

export const useProjectCollaborators = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['collaborators', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      // Get direct project collaborators
      const { data: collaborators, error: collabError } = await supabase
        .from('project_collaborators')
        .select(`
          *,
          user:users(id, full_name, email, avatar_url, username)
        `)
        .eq('project_id', projectId)
        .eq('is_active', true);
      
      if (collabError) throw collabError;
      
      // Also get organization members if project is in an org
      const { data: project } = await supabase
        .from('projects')
        .select('organization_id, owner_id')
        .eq('id', projectId)
        .single();
      
      let orgMembers: any[] = [];
      if (project?.organization_id) {
        const { data: orgData } = await supabase
          .from('organization_members')
          .select(`
            *,
            user:users(id, full_name, email, avatar_url, username)
          `)
          .eq('organization_id', project.organization_id)
          .eq('is_active', true);
        
        if (orgData) orgMembers = orgData;
      }
      
      // Combine and deduplicate by user_id
      const allMembers = [...(collaborators || []), ...orgMembers];
      const uniqueMembers = allMembers.reduce((acc, member) => {
        const userId = member.user?.id || member.user_id;
        if (!acc.find(m => (m.user?.id || m.user_id) === userId)) {
          acc.push(member);
        }
        return acc;
      }, [] as any[]);
      
      return uniqueMembers;
    },
    enabled: !!projectId,
  });
};

// Add collaborator to project
export const useAddProjectCollaborator = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      projectId, 
      email, 
      role = 'viewer' as 'owner' | 'contributor' | 'viewer',
      invitedBy 
    }: { 
      projectId: string; 
      email: string; 
      role?: 'owner' | 'contributor' | 'viewer';
      invitedBy: string;
    }) => {
      // First, find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();
      
      if (userError || !user) {
        throw new Error('No user exists with that email');
      }
      
      // Check if already a collaborator
      const { data: existing } = await supabase
        .from('project_collaborators')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();
      
      if (existing) {
        // Update existing collaborator
        const { error: updateError } = await supabase
          .from('project_collaborators')
          .update({ 
            role,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (updateError) throw updateError;
      } else {
        // Add new collaborator
        const { error: insertError } = await supabase
          .from('project_collaborators')
          .insert({
            project_id: projectId,
            user_id: user.id,
            role,
            invited_by: invitedBy,
            is_active: true
          });
        
        if (insertError) throw insertError;
      }
      
      // Call notification function
      const { error: notifyError } = await supabase.rpc('notify_collaborator_added', {
        p_project_id: projectId,
        p_user_id: user.id,
        p_invited_by: invitedBy
      });
      
      if (notifyError) {
        console.error('Failed to send notification:', notifyError);
        // Don't throw - collaboration was added successfully
      }
      
      return user;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};

// Update collaborator role
export const useUpdateCollaboratorRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      collaboratorId,
      role,
      projectId
    }: {
      collaboratorId: string;
      role: 'owner' | 'contributor' | 'viewer';
      projectId: string;
    }) => {
      const { error } = await supabase
        .from('project_collaborators')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', collaboratorId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', variables.projectId] });
    },
  });
};

// Remove collaborator
export const useRemoveCollaborator = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      collaboratorId,
      projectId
    }: {
      collaboratorId: string;
      projectId: string;
    }) => {
      const { error } = await supabase
        .from('project_collaborators')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', collaboratorId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', variables.projectId] });
    },
  });
};

// ===== UPLOAD FILE TO STORAGE =====

export const useUploadFile = () => {
  const { user } = useAuth();
  const createAttachment = useCreateAttachment();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      entityType, 
      entityId 
    }: { 
      file: File; 
      entityType: string; 
      entityId: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${entityId}/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);
      
      // Create attachment record
      await createAttachment.mutateAsync({
        file_name: file.name,
        file_path: publicUrl,
        file_size: file.size,
        file_type: fileExt || 'unknown',
        mime_type: file.type,
        storage_bucket: 'attachments',
        storage_path: fileName,
        entity_type: entityType,
        entity_id: entityId,
        uploaded_by: user.id,
      });
      
      return { publicUrl, fileName };
    },
  });
};
