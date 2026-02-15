/**
 * Database TypeScript Types
 * Auto-generated types for the SyncScript Supabase database schema
 * These types match the database schema in database/schema.sql
 */

// Custom Enums
export type UserRole = 'admin' | 'user' | 'moderator' | 'guest';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'expired' | 'trial';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'archived';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'update';
export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';
export type Visibility = 'public' | 'private' | 'internal';
export type EntityType = 'task' | 'project' | 'document' | 'comment' | 'user' | 'organization';

// JSON types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Database Tables
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          bio: string | null;
          timezone: string;
          locale: string;
          email_verified: boolean;
          phone_verified: boolean;
          two_factor_enabled: boolean;
          preferences: Json;
          notification_settings: Json;
          is_active: boolean;
          is_banned: boolean;
          last_login_at: string | null;
          last_active_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          bio?: string | null;
          timezone?: string;
          locale?: string;
          email_verified?: boolean;
          phone_verified?: boolean;
          two_factor_enabled?: boolean;
          preferences?: Json;
          notification_settings?: Json;
          is_active?: boolean;
          is_banned?: boolean;
          last_login_at?: string | null;
          last_active_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          bio?: string | null;
          timezone?: string;
          locale?: string;
          email_verified?: boolean;
          phone_verified?: boolean;
          two_factor_enabled?: boolean;
          preferences?: Json;
          notification_settings?: Json;
          is_active?: boolean;
          is_banned?: boolean;
          last_login_at?: string | null;
          last_active_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          date_of_birth: string | null;
          gender: string | null;
          country: string | null;
          city: string | null;
          address: string | null;
          postal_code: string | null;
          company: string | null;
          job_title: string | null;
          website: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          twitter_url: string | null;
          custom_fields: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date_of_birth?: string | null;
          gender?: string | null;
          country?: string | null;
          city?: string | null;
          address?: string | null;
          postal_code?: string | null;
          company?: string | null;
          job_title?: string | null;
          website?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          twitter_url?: string | null;
          custom_fields?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date_of_birth?: string | null;
          gender?: string | null;
          country?: string | null;
          city?: string | null;
          address?: string | null;
          postal_code?: string | null;
          company?: string | null;
          job_title?: string | null;
          website?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          twitter_url?: string | null;
          custom_fields?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          website: string | null;
          owner_id: string | null;
          settings: Json;
          max_members: number;
          max_projects: number;
          is_active: boolean;
          subscription_status: SubscriptionStatus;
          subscription_ends_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          logo_url?: string | null;
          website?: string | null;
          owner_id?: string | null;
          settings?: Json;
          max_members?: number;
          max_projects?: number;
          is_active?: boolean;
          subscription_status?: SubscriptionStatus;
          subscription_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          logo_url?: string | null;
          website?: string | null;
          owner_id?: string | null;
          settings?: Json;
          max_members?: number;
          max_projects?: number;
          is_active?: boolean;
          subscription_status?: SubscriptionStatus;
          subscription_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: UserRole;
          permissions: Json;
          is_active: boolean;
          invited_by: string | null;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: UserRole;
          permissions?: Json;
          is_active?: boolean;
          invited_by?: string | null;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: UserRole;
          permissions?: Json;
          is_active?: boolean;
          invited_by?: string | null;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          owner_id: string | null;
          organization_id: string | null;
          icon: string | null;
          cover_image_url: string | null;
          color: string;
          tags: string[];
          settings: Json;
          visibility: Visibility;
          status: TaskStatus;
          priority: PriorityLevel;
          progress: number;
          start_date: string | null;
          due_date: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          owner_id?: string | null;
          organization_id?: string | null;
          icon?: string | null;
          cover_image_url?: string | null;
          color?: string;
          tags?: string[];
          settings?: Json;
          visibility?: Visibility;
          status?: TaskStatus;
          priority?: PriorityLevel;
          progress?: number;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          owner_id?: string | null;
          organization_id?: string | null;
          icon?: string | null;
          cover_image_url?: string | null;
          color?: string;
          tags?: string[];
          settings?: Json;
          visibility?: Visibility;
          status?: TaskStatus;
          priority?: PriorityLevel;
          progress?: number;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          project_id: string;
          created_by: string | null;
          assigned_to: string | null;
          parent_task_id: string | null;
          status: TaskStatus;
          priority: PriorityLevel;
          tags: string[];
          labels: Json;
          progress: number;
          estimated_hours: number | null;
          actual_hours: number | null;
          start_date: string | null;
          due_date: string | null;
          completed_at: string | null;
          position: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          project_id: string;
          created_by?: string | null;
          assigned_to?: string | null;
          parent_task_id?: string | null;
          status?: TaskStatus;
          priority?: PriorityLevel;
          tags?: string[];
          labels?: Json;
          progress?: number;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          project_id?: string;
          created_by?: string | null;
          assigned_to?: string | null;
          parent_task_id?: string | null;
          status?: TaskStatus;
          priority?: PriorityLevel;
          tags?: string[];
          labels?: Json;
          progress?: number;
          estimated_hours?: number | null;
          actual_hours?: number | null;
          start_date?: string | null;
          due_date?: string | null;
          completed_at?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      comments: {
        Row: {
          id: string;
          content: string;
          entity_type: EntityType;
          entity_id: string;
          user_id: string;
          parent_comment_id: string | null;
          mentions: string[];
          attachments: Json;
          is_edited: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          content: string;
          entity_type: EntityType;
          entity_id: string;
          user_id: string;
          parent_comment_id?: string | null;
          mentions?: string[];
          attachments?: Json;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          content?: string;
          entity_type?: EntityType;
          entity_id?: string;
          user_id?: string;
          parent_comment_id?: string | null;
          mentions?: string[];
          attachments?: Json;
          is_edited?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      attachments: {
        Row: {
          id: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          mime_type: string;
          storage_bucket: string;
          storage_path: string;
          entity_type: EntityType | null;
          entity_id: string | null;
          uploaded_by: string;
          upload_status: UploadStatus;
          metadata: Json;
          thumbnail_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          file_name: string;
          file_path: string;
          file_size: number;
          file_type: string;
          mime_type: string;
          storage_bucket?: string;
          storage_path: string;
          entity_type?: EntityType | null;
          entity_id?: string | null;
          uploaded_by: string;
          upload_status?: UploadStatus;
          metadata?: Json;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          file_name?: string;
          file_path?: string;
          file_size?: number;
          file_type?: string;
          mime_type?: string;
          storage_bucket?: string;
          storage_path?: string;
          entity_type?: EntityType | null;
          entity_id?: string | null;
          uploaded_by?: string;
          upload_status?: UploadStatus;
          metadata?: Json;
          thumbnail_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          metadata: Json;
          created_at: string;
          created_date: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          entity_type: string | null;
          entity_id: string | null;
          actor_id: string | null;
          read: boolean;
          read_at: string | null;
          sent_via: string[];
          metadata: Json;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type?: NotificationType;
          title: string;
          message: string;
          entity_type?: string | null;
          entity_id?: string | null;
          actor_id?: string | null;
          read?: boolean;
          read_at?: string | null;
          sent_via?: string[];
          metadata?: Json;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          title?: string;
          message?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          actor_id?: string | null;
          read?: boolean;
          read_at?: string | null;
          sent_via?: string[];
          metadata?: Json;
          created_at?: string;
          expires_at?: string | null;
        };
      };
      webhooks: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string | null;
          name: string;
          url: string;
          secret: string | null;
          events: string[];
          is_active: boolean;
          headers: Json;
          last_triggered_at: string | null;
          total_triggers: number;
          failed_triggers: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by?: string | null;
          name: string;
          url: string;
          secret?: string | null;
          events: string[];
          is_active?: boolean;
          headers?: Json;
          last_triggered_at?: string | null;
          total_triggers?: number;
          failed_triggers?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          created_by?: string | null;
          name?: string;
          url?: string;
          secret?: string | null;
          events?: string[];
          is_active?: boolean;
          headers?: Json;
          last_triggered_at?: string | null;
          total_triggers?: number;
          failed_triggers?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          name: string;
          key_hash: string;
          prefix: string;
          scopes: string[];
          permissions: Json;
          is_active: boolean;
          rate_limit: number;
          last_used_at: string | null;
          total_requests: number;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          name: string;
          key_hash: string;
          prefix: string;
          scopes?: string[];
          permissions?: Json;
          is_active?: boolean;
          rate_limit?: number;
          last_used_at?: string | null;
          total_requests?: number;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string | null;
          name?: string;
          key_hash?: string;
          prefix?: string;
          scopes?: string[];
          permissions?: Json;
          is_active?: boolean;
          rate_limit?: number;
          last_used_at?: string | null;
          total_requests?: number;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          revoked_at?: string | null;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          token_hash: string;
          device_info: Json;
          ip_address: string | null;
          user_agent: string | null;
          location: Json | null;
          is_active: boolean;
          created_at: string;
          expires_at: string;
          last_activity_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token_hash: string;
          device_info?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          location?: Json | null;
          is_active?: boolean;
          created_at?: string;
          expires_at: string;
          last_activity_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token_hash?: string;
          device_info?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          location?: Json | null;
          is_active?: boolean;
          created_at?: string;
          expires_at?: string;
          last_activity_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          color: string;
          organization_id: string | null;
          description: string | null;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          color?: string;
          organization_id?: string | null;
          description?: string | null;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          color?: string;
          organization_id?: string | null;
          description?: string | null;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      cache: {
        Row: {
          key: string;
          value: Json;
          tags: string[];
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          tags?: string[];
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          tags?: string[];
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      subscription_status: SubscriptionStatus;
      task_status: TaskStatus;
      priority_level: PriorityLevel;
      notification_type: NotificationType;
      upload_status: UploadStatus;
    };
  };
}

// Helper types for easier use
export type User = Database['public']['Tables']['users']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type OrganizationMember = Database['public']['Tables']['organization_members']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Attachment = Database['public']['Tables']['attachments']['Row'];
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type Webhook = Database['public']['Tables']['webhooks']['Row'];
export type ApiKey = Database['public']['Tables']['api_keys']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];
export type Cache = Database['public']['Tables']['cache']['Row'];

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type ProjectUpdate = Database['public']['Tables']['projects']['Update'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];
