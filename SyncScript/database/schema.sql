-- ============================================================================
-- SyncScript — Master Database Schema
-- Run this FIRST in Supabase SQL Editor
-- ============================================================================
-- Execution order:
--   1. schema.sql        (this file)
--   2. functions.sql
--   3. triggers.sql
--   4. rls_policies.sql
--   5. caching.sql
--   6. edge_cases.sql
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Trigram text search


-- ────────────────────────────────────────────────────────────────────────────
-- Custom ENUM Types
-- ────────────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user', 'moderator', 'guest');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'expired', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('info', 'warning', 'error', 'success', 'update');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE upload_status AS ENUM ('pending', 'uploading', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE visibility AS ENUM ('public', 'private', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('task', 'project', 'document', 'comment', 'user', 'organization');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- TABLE 1: users
-- Main user table — linked to auth.users via id
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  username        TEXT UNIQUE,
  full_name       TEXT,
  avatar_url      TEXT,
  role            user_role NOT NULL DEFAULT 'user',
  bio             TEXT,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  locale          TEXT NOT NULL DEFAULT 'en',
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  preferences     JSONB NOT NULL DEFAULT '{}',
  notification_settings JSONB NOT NULL DEFAULT '{"email": true, "push": true, "sms": false}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at   TIMESTAMPTZ,
  last_active_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active) WHERE is_active = TRUE;


-- ============================================================================
-- TABLE 2: user_profiles
-- Extended profile data
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  date_of_birth   DATE,
  gender          TEXT,
  country         TEXT,
  city            TEXT,
  address         TEXT,
  postal_code     TEXT,
  company         TEXT,
  job_title       TEXT,
  website         TEXT,
  linkedin_url    TEXT,
  github_url      TEXT,
  twitter_url     TEXT,
  custom_fields   JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);


-- ============================================================================
-- TABLE 3: organizations
-- Research groups / labs / teams
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  description           TEXT,
  logo_url              TEXT,
  website               TEXT,
  owner_id              UUID REFERENCES public.users(id) ON DELETE SET NULL,
  settings              JSONB NOT NULL DEFAULT '{}',
  max_members           INT NOT NULL DEFAULT 50,
  max_projects          INT NOT NULL DEFAULT 100,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_status   subscription_status NOT NULL DEFAULT 'trial',
  subscription_ends_at  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(is_active) WHERE is_active = TRUE AND deleted_at IS NULL;


-- ============================================================================
-- TABLE 4: organization_members
-- Many-to-many: users ↔ organizations  (RBAC lives here)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'user',
  permissions     JSONB NOT NULL DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  invited_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_active ON public.organization_members(is_active) WHERE is_active = TRUE;


-- ============================================================================
-- TABLE 5: projects  (Knowledge Vaults)
-- Each "Vault" is a project — owned by a user, optionally in an org
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL,
  description       TEXT,
  owner_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  organization_id   UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  icon              TEXT,
  cover_image_url   TEXT,
  color             TEXT NOT NULL DEFAULT 'blue',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  settings          JSONB NOT NULL DEFAULT '{}',
  visibility        visibility NOT NULL DEFAULT 'private',
  status            task_status NOT NULL DEFAULT 'pending',
  priority          priority_level NOT NULL DEFAULT 'medium',
  progress          INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  start_date        DATE,
  due_date          DATE,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  -- Slugs must be unique per owner (when not soft-deleted)
  UNIQUE (owner_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON public.projects(visibility);
CREATE INDEX IF NOT EXISTS idx_projects_active ON public.projects(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_projects_tags ON public.projects USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON public.projects(slug);


-- ============================================================================
-- TABLE 6: tasks
-- Research tasks within a Vault
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  description     TEXT,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  parent_task_id  UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  status          task_status NOT NULL DEFAULT 'pending',
  priority        priority_level NOT NULL DEFAULT 'medium',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  labels          JSONB NOT NULL DEFAULT '{}',
  progress        INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  estimated_hours DECIMAL(8,2),
  actual_hours    DECIMAL(8,2),
  start_date      DATE,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  position        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON public.tasks(project_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON public.tasks(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON public.tasks USING GIN(tags);


-- ============================================================================
-- TABLE 7: comments
-- Polymorphic comments — attached to any entity (vault chat, task notes, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content           TEXT NOT NULL,
  entity_type       entity_type NOT NULL,
  entity_id         UUID NOT NULL,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  mentions          TEXT[] NOT NULL DEFAULT '{}',
  attachments       JSONB NOT NULL DEFAULT '[]',
  is_edited         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_active ON public.comments(id) WHERE deleted_at IS NULL;


-- ============================================================================
-- TABLE 8: attachments
-- File uploads — linked to Supabase Storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name       TEXT NOT NULL,
  file_path       TEXT NOT NULL,
  file_size       BIGINT NOT NULL,
  file_type       TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  storage_bucket  TEXT NOT NULL DEFAULT 'attachments',
  storage_path    TEXT NOT NULL,
  entity_type     entity_type,
  entity_id       UUID,
  uploaded_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  upload_status   upload_status NOT NULL DEFAULT 'pending',
  metadata        JSONB NOT NULL DEFAULT '{}',
  thumbnail_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON public.attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader ON public.attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attachments_status ON public.attachments(upload_status);
CREATE INDEX IF NOT EXISTS idx_attachments_active ON public.attachments(id) WHERE deleted_at IS NULL;


-- ============================================================================
-- TABLE 9: activity_logs
-- Immutable audit trail — never updated or deleted
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,              -- e.g., 'create', 'update', 'delete', 'login'
  entity_type   TEXT NOT NULL,              -- e.g., 'project', 'task', 'comment'
  entity_id     UUID,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_date  DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Partition-friendly index on date for log rotation
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON public.activity_logs(created_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);


-- ============================================================================
-- TABLE 10: notifications
-- User notifications — in-app, email, SMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type          notification_type NOT NULL DEFAULT 'info',
  title         TEXT NOT NULL,
  message       TEXT NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  actor_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  sent_via      TEXT[] NOT NULL DEFAULT '{in_app}',
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_type, entity_id);


-- ============================================================================
-- TABLE 11: webhooks
-- Organization-level webhook subscriptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.webhooks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  url               TEXT NOT NULL,
  secret            TEXT,
  events            TEXT[] NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  headers           JSONB NOT NULL DEFAULT '{}',
  last_triggered_at TIMESTAMPTZ,
  total_triggers    INT NOT NULL DEFAULT 0,
  failed_triggers   INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON public.webhooks(is_active) WHERE is_active = TRUE;


-- ============================================================================
-- TABLE 12: api_keys
-- Developer API keys with scoped permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id   UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  key_hash          TEXT NOT NULL UNIQUE,
  prefix            TEXT NOT NULL,               -- e.g., "sk_live_abc..."
  scopes            TEXT[] NOT NULL DEFAULT '{}',
  permissions       JSONB NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  rate_limit        INT NOT NULL DEFAULT 1000,   -- requests per hour
  last_used_at      TIMESTAMPTZ,
  total_requests    BIGINT NOT NULL DEFAULT 0,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = TRUE AND revoked_at IS NULL;


-- ============================================================================
-- TABLE 13: sessions
-- User session tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash        TEXT NOT NULL UNIQUE,
  device_info       JSONB NOT NULL DEFAULT '{}',
  ip_address        INET,
  user_agent        TEXT,
  location          JSONB,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.sessions(is_active, expires_at) WHERE is_active = TRUE;


-- ============================================================================
-- TABLE 14: tags
-- Shared tag library
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  color           TEXT NOT NULL DEFAULT '#6366f1',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  description     TEXT,
  usage_count     INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (slug, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_org ON public.tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON public.tags(usage_count DESC);


-- ============================================================================
-- TABLE 15: cache
-- Application-level key/value cache with TTL
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cache (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON public.cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_tags ON public.cache USING GIN(tags);


-- ============================================================================
-- Enable Realtime for key tables
-- (Supabase Realtime listens to these for WebSocket broadcasting)
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attachments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_collaborators;


-- ============================================================================
-- TABLE: project_collaborators
-- Direct sharing of projects to individual users (not just through orgs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'contributor', 'viewer')),
  invited_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at       TIMESTAMPTZ,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project ON public.project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user ON public.project_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_active ON public.project_collaborators(is_active) WHERE is_active = TRUE;


-- ============================================================================
-- Done! Proceed to functions.sql →
-- ============================================================================
