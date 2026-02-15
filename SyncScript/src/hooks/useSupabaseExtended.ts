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
      // @ts-ignore - Supabase type mismatch
      const { data, error } = await supabase
        .from('comments')
        .insert(comment)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ 
          queryKey: ['comments', data.entity_type, data.entity_id] 
        });
      }
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
      if (!project) throw new Error('Project not found');
      
      const currentTags = project.tags || [];
      const newTags = isFavorite
        ? [...currentTags.filter((t: string) => t !== 'favorite'), 'favorite']
        : currentTags.filter((t: string) => t !== 'favorite');
      
      // @ts-ignore - Supabase type mismatch
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

// ===== SHARED PROJECTS (Organization Members + Direct Collaborators) =====

export const useSharedProjects = () => {
  const { user, loading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ['shared-projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        // 1. Get projects from organizations user is a member of
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
        }
        
        // Flatten projects from all organizations
        const orgProjects: any[] = [];
        if (memberships) {
          memberships.forEach((membership: any) => {
            if (membership.organizations?.projects) {
              membership.organizations.projects.forEach((project: any) => {
                // Don't include projects user owns
                if (project.owner_id !== user.id && !project.deleted_at) {
                  orgProjects.push({
                    ...project,
                    role: membership.role,
                    owner: project.owner || membership.organizations.projects[0]?.owner,
                    source: 'organization'
                  });
                }
              });
            }
          });
        }
        
        // 2. Get projects where user is a direct collaborator
        // @ts-ignore - Supabase type mismatch
        const { data: collaborations, error: collabError } = await supabase
          .from('project_collaborators')
          .select(`
            role,
            project:projects (
              *,
              owner:users(id, full_name, email)
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (collabError) {
          console.error('Error fetching collaborations:', collabError);
        }
        
        // Flatten collaboration projects
        const collabProjects: any[] = [];
        if (collaborations) {
          collaborations.forEach((collab: any) => {
            const project = collab.project;
            // Don't include projects user owns or that are deleted
            if (project && project.owner_id !== user.id && !project.deleted_at) {
              collabProjects.push({
                ...project,
                role: collab.role,
                owner: project.owner,
                source: 'collaboration'
              });
            }
          });
        }
        
        // 3. Combine and deduplicate by project ID
        const allProjects = [...orgProjects, ...collabProjects];
        const uniqueProjects = allProjects.reduce((acc, project) => {
          if (!acc.find(p => p.id === project.id)) {
            acc.push(project);
          }
          return acc;
        }, [] as any[]);
        
        console.log('[DEBUG] Shared projects:', {
          orgProjects: orgProjects.length,
          collabProjects: collabProjects.length,
          total: uniqueProjects.length
        });
        
        return uniqueProjects;
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
      
      console.log('[DEBUG] Fetching collaborators for project:', projectId);
      
      // Use the SECURITY DEFINER function to bypass RLS recursion
      const { data: collaborators, error: collabError } = await supabase
        .rpc('get_project_collaborators', { p_project_id: projectId }) as any;
      
      console.log('[DEBUG] Collaborators query result:', { collaborators, collabError });
      
      if (collabError) throw collabError;
      
      // Transform the data to match the expected format
      const transformedCollaborators = ((collaborators as any[]) || []).map((collab: any) => ({
        id: collab.id,
        project_id: collab.project_id,
        user_id: collab.user_id,
        role: collab.role,
        invited_by: collab.invited_by,
        invited_at: collab.invited_at,
        is_active: collab.is_active,
        user: {
          id: collab.user_id,
          full_name: collab.user_full_name,
          email: collab.user_email,
          avatar_url: collab.user_avatar_url,
          username: collab.user_email?.split('@')[0]
        }
      }));
      
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
      const allMembers = [...transformedCollaborators, ...orgMembers];
      const uniqueMembers = allMembers.reduce((acc, member) => {
        const userId = member.user?.id || member.user_id;
        if (!acc.find(m => (m.user?.id || m.user_id) === userId)) {
          acc.push(member);
        }
        return acc;
      }, [] as any[]);
      
      console.log('[DEBUG] Final unique members:', uniqueMembers);
      
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
      console.log('[DEBUG] Adding collaborator:', { projectId, email, role, invitedBy });
      
      // First, find user by email
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase().trim())
        .eq('is_active', true)
        .single();
      
      console.log('[DEBUG] User lookup result:', { user, userError });
      
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
        console.log('[DEBUG] Updating existing collaborator:', existing.id);
        // @ts-ignore - Supabase type mismatch
        const { error: updateError } = await supabase
          .from('project_collaborators')
          .update({ 
            role,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error('[DEBUG] Update error:', updateError);
          throw updateError;
        }
      } else {
        // Add new collaborator
        console.log('[DEBUG] Inserting new collaborator');
        // @ts-ignore - Supabase type mismatch
        const { error: insertError } = await supabase
          .from('project_collaborators')
          .insert({
            project_id: projectId,
            user_id: user.id,
            role,
            invited_by: invitedBy,
            is_active: true
          });
        
        if (insertError) {
          console.error('[DEBUG] Insert error:', insertError);
          throw insertError;
        }
      }
      
      // Call notification function (creates notification and sends email)
      // @ts-ignore - Supabase type mismatch
      const { error: notifyError } = await supabase.rpc('notify_collaborator_added', {
        p_project_id: projectId,
        p_user_id: user.id,
        p_invited_by: invitedBy
      });
      
      if (notifyError) {
        console.error('Failed to send notification:', notifyError);
        // Don't throw - collaboration was added successfully
      }

      // Also try to call Edge Function for email (if available)
      try {
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();

        const { data: inviter } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', invitedBy)
          .single();

        await supabase.functions.invoke('send-collaboration-email', {
          body: {
            to: user.email,
            subject: 'You have been added to a project',
            project_name: project?.name || 'a project',
            inviter_name: inviter?.full_name || inviter?.email || 'Someone',
            project_id: projectId,
          },
        });
      } catch (emailError) {
        console.error('Edge function email failed (may not be deployed):', emailError);
        // Don't throw - notification was created in database
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
