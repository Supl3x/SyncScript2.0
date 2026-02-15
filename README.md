# SyncScript — Collaborative Research & Citation Engine

> **Hackfest x Datathon — Case Study Challenge | Web Development**

**Live Demo:** [https://sync-script2-0.vercel.app](https://sync-script2-0.vercel.app)  
**Repository:** [https://github.com/Supl3x/SyncScript2.0](https://github.com/Supl3x/SyncScript2.0)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Design Decisions & Assumptions](#design-decisions--assumptions)
3. [System Architecture](#system-architecture)
4. [Tech Stack](#tech-stack)
5. [Data Model & Database Schema](#data-model--database-schema)
6. [Core Functionality](#core-functionality)
7. [Security & Access Control (RBAC)](#security--access-control-rbac)
8. [Real-Time & Performance](#real-time--performance)
9. [Cloud Integration & File Management](#cloud-integration--file-management)
10. [Caching Strategy](#caching-strategy)
11. [Edge Cases & Data Integrity](#edge-cases--data-integrity)
12. [Notifications & Automation](#notifications--automation)
13. [Pages & UI Components](#pages--ui-components)
14. [Getting Started](#getting-started)
15. [Database Setup](#database-setup)
16. [Deployment](#deployment)
17. [Directory Structure](#directory-structure)

---

## Project Overview

In academia and professional research, information is often siloed. SyncScript bridges this gap by providing a platform where researchers can collaboratively build **Knowledge Vaults** — shared repositories of verified sources, annotated PDFs, and cross-referenced citations with real-time synchronization.

SyncScript is architected as a **high-concurrency collaborative engine** capable of handling complex data relationships, instant updates, role-based access, and concurrent editing — not just a simple CRUD application.

### Key Problems Solved

- **Concurrency Control:** Multiple users can edit the same Knowledge Vault simultaneously via advisory locking and real-time presence tracking without data loss.
- **Complex Data Relationships:** A relational PostgreSQL schema with 20 tables manages many-to-many relationships between researchers, organizations, vaults, tasks, comments, and attachments.
- **File Integrity & Security:** Uploaded research files are stored immutably in Supabase Storage with Row Level Security (RLS) policies ensuring only authorized collaborators can access them.

---

## Design Decisions & Assumptions

1. **Hand-drawn "Notebook" Aesthetic:** The entire UI uses custom CSS (sketchy borders, graph-paper backgrounds, "Architects Daughter" and "Patrick Hand" fonts) to create a distinctive research-notebook feel that differentiates SyncScript from generic tools.

2. **Soft-Delete Everywhere:** All major entities use `deleted_at` timestamps instead of hard deletes — preserving audit trails and enabling recovery.

3. **Polymorphic Comments & Attachments:** Rather than creating separate tables per entity, a single `comments` and `attachments` table uses `entity_type` + `entity_id` columns, enabling flexible attachment to any resource (projects, tasks, documents, etc.).

4. **Dual Collaboration Model:** Two sharing pathways:
   - **Organization-level** — for research teams/labs with hierarchical roles.
   - **Direct project-level** — for inviting individual collaborators by email without requiring an organization.

5. **Favorites via Tags Array:** Instead of a separate junction table, favorites are stored as `'favorite'` entries in the project's `tags` text[] column — reducing table count and simplifying queries.

6. **Immutable Audit Logs:** `activity_logs` is append-only by design (no UPDATE or DELETE RLS policies), ensuring complete research integrity.

7. **Database as Source of Truth:** User profiles are auto-created by a database trigger (`handle_new_user`) on signup — the frontend never manually inserts into the `users` table.

8. **Advisory Locking for Concurrency:** PostgreSQL's `pg_try_advisory_lock` system is used for vault-level edit concurrency control, preventing conflicting write operations.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                             │
│  React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui           │
│  TanStack React Query (caching, optimistic updates)                │
│  React Router v6 (SPA routing)                                     │
│  Quill.js (collaborative rich text editing)                        │
│  react-pdf (PDF viewing)                                           │
└──────────────────────┬──────────────────────────────────────────────┘
                       │ HTTPS / WebSocket
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE PLATFORM                              │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐  │
│  │   Auth       │  │  Storage    │  │  Edge Functions (Deno)    │  │
│  │  (JWT +      │  │ (avatars,   │  │  - send-collaboration-    │  │
│  │  email/pass) │  │ attachments)│  │    email (Gmail SMTP)     │  │
│  └──────┬───────┘  └─────────────┘  └───────────────────────────┘  │
│         │                                                           │
│  ┌──────▼──────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                             │   │
│  │  20 Tables | 8 Enums | 40+ RLS Policies | 15+ Triggers     │   │
│  │  12+ Functions | Materialized Views | KV Cache              │   │
│  └──────┬──────────────────────────────────────────────────────┘   │
│         │                                                           │
│  ┌──────▼──────────────────────────────────────────────────────┐   │
│  │           Supabase Realtime (WebSocket)                      │   │
│  │  Live subscriptions on: projects, tasks, comments,           │   │
│  │  notifications, attachments, collaborators, document_content,│   │
│  │  document_presence, document_operations                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL (Deployment)                               │
│  Static site hosting | CDN | Automatic HTTPS | SPA rewrite rules   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 + TypeScript |
| **Build Tool** | Vite (SWC compiler) |
| **UI Framework** | Tailwind CSS 3 + shadcn/ui (Radix UI primitives) |
| **Icons** | Lucide React |
| **State & Data Fetching** | TanStack React Query v5 |
| **Routing** | React Router v6 |
| **Rich Text Editor** | Quill.js (react-quill) + quill-cursors |
| **PDF Rendering** | react-pdf + pdfjs-dist |
| **Forms & Validation** | React Hook Form + Zod |
| **Charts** | Recharts |
| **Date Utilities** | date-fns |
| **Toast Notifications** | Sonner + Radix Toast |
| **Resizable Panels** | react-resizable-panels |
| **Authentication** | Supabase Auth (email/password, JWT) |
| **Database** | PostgreSQL via Supabase |
| **Cloud Storage** | Supabase Storage (S3-compatible) |
| **Real-Time** | Supabase Realtime (postgres_changes via WebSocket) |
| **Edge Functions** | Supabase Edge Functions (Deno runtime) |
| **Testing** | Vitest + Testing Library |
| **Deployment** | Vercel |

---

## Data Model & Database Schema

### Entity Relationship Overview

```
auth.users (Supabase)
    │
    ▼ trigger: handle_new_user()
┌──────────┐         ┌──────────────────┐
│  users   │────────►│  user_profiles   │
└────┬─────┘         └──────────────────┘
     │
     ├──── owns ──────────────►┌───────────────┐
     │                         │ organizations  │
     │                         └───────┬────────┘
     │                                 │
     ├──── member of ─►┌───────────────▼────────────┐
     │                 │  organization_members (M:N) │
     │                 └────────────────────────────┘
     │
     ├──── owns ──────────►┌───────────┐
     │                     │  projects  │◄──── "Knowledge Vaults"
     │                     └─────┬──────┘
     │                           │
     ├──── collaborator ──►┌─────▼──────────────────┐
     │                     │ project_collaborators   │
     │                     │ (owner/contributor/     │
     │                     │  viewer)                │
     │                     └────────────────────────┘
     │                           │
     │                     ┌─────▼──────┐
     │                     │   tasks    │ (subtasks via parent_task_id)
     │                     └────────────┘
     │                           │
     │                     ┌─────▼──────────┐
     │                     │   comments     │ (polymorphic: entity_type + entity_id)
     │                     └────────────────┘
     │                           │
     │                     ┌─────▼──────────┐
     │                     │  attachments   │──►  Supabase Storage
     │                     └────────────────┘
     │                           │
     │                     ┌─────▼───────────────────┐
     │                     │  document_content       │ (Quill Delta JSON)
     │                     │  document_presence      │ (cursor/selection)
     │                     │  document_operations    │ (version log)
     │                     └─────────────────────────┘
     │
     ├──►  activity_logs       (immutable audit trail)
     ├──►  notifications       (in-app, email, SMS)
     ├──►  sessions            (tracked device sessions)
     └──►  api_keys            (developer API keys with scoped permissions)

     Shared: tags, cache, rate_limits, webhooks
```

### Tables (20 total)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | Core user data, linked to `auth.users`. Roles, preferences (JSONB), notification settings, activity timestamps, soft-delete. |
| 2 | `user_profiles` | Extended profile: DoB, location, company, job title, social links, custom fields (JSONB). |
| 3 | `organizations` | Research teams/labs. Slug (unique), settings, subscription status, member/project limits. |
| 4 | `organization_members` | Many-to-many users↔organizations. Role-based (admin/user/moderator/guest), permissions JSONB. |
| 5 | `projects` | **Knowledge Vaults.** Name, slug, description, color, tags[], visibility (public/private/internal), status, priority, progress (0-100), dates. |
| 6 | `project_collaborators` | Direct project sharing. Roles: `owner`, `contributor`, `viewer`. Invited_by tracking. |
| 7 | `tasks` | Research tasks within vaults. Subtask hierarchy (parent_task_id), assigned_to, status, priority, progress, estimated/actual hours, ordering. |
| 8 | `comments` | Polymorphic comments via entity_type + entity_id. Threaded replies (parent_comment_id), @mentions, attachment references, edit tracking. |
| 9 | `attachments` | File uploads linked to Supabase Storage. Tracks file metadata, upload status, entity linkage, thumbnails. |
| 10 | `document_content` | Collaborative document content stored as Quill Delta JSON. Version tracking, last_edited_by. |
| 11 | `document_presence` | Active editor presence: cursor position, selection range, user color, last_seen timestamp. |
| 12 | `document_operations` | Versioned edit operation log for conflict resolution. |
| 13 | `activity_logs` | Immutable audit trail. Records action, entity, old/new values (JSONB), IP, user agent. Date-partitioned for log rotation. |
| 14 | `notifications` | In-app notifications. Type (info/warning/error/success/update), read status, sent_via channels, expiry. |
| 15 | `webhooks` | Organization-level webhook subscriptions with event filtering, secret signing, trigger statistics. |
| 16 | `api_keys` | Developer API keys with hashed storage, scoped permissions, rate limits, usage tracking, expiry/revocation. |
| 17 | `sessions` | User session tracking: device info, IP, location, activity timestamps. |
| 18 | `tags` | Shared tag library with color, slug, organization scoping, usage counts. |
| 19 | `cache` | Application-level key/value cache with TTL and tag-based invalidation. |
| 20 | `rate_limits` | Per-endpoint rate limit tracking with configurable windows. |

### Custom ENUM Types (8)

`user_role` · `subscription_status` · `task_status` · `priority_level` · `notification_type` · `upload_status` · `visibility` · `entity_type`

### PostgreSQL Extensions

- `uuid-ossp` — UUID generation (`uuid_generate_v4()`)
- `pgcrypto` — Cryptographic functions (`gen_random_uuid()`, `crypt()`)
- `pg_trgm` — Trigram-based text search for fuzzy matching

---

## Core Functionality

### Knowledge Vaults (Projects)

- **Create Vaults** with title, description, color coding (blue/green/red/yellow), auto-generated URL-safe slugs with collision detection.
- **Full CRUD** with soft-delete support.
- **Visibility Controls:** Public, Private, or Internal.
- **Status Tracking:** Pending → In Progress → Completed/Cancelled/Archived.
- **Priority Levels:** Low, Medium, High, Urgent.
- **Progress Tracking:** 0-100% with automatic recalculation when tasks complete.
- **Tagging System:** Array-based tags for organization and filtering (including favorites).
- **Search & Filter:** Client-side search across vault names.

### Resource Management (Attachments)

- **File Upload:** Supabase Storage integration with structured paths (`user_id/entity_id/timestamp.ext`).
- **Multi-Format Support:**
  - **PDF:** Full viewer with page navigation, zoom (50%-300%), text layer, annotation layer.
  - **Word Docs (.doc/.docx):** Microsoft Office Online iframe (read-only) + Quill editor (edit mode).
  - **Images:** Inline display with download.
  - **Other Formats:** Download fallback.
- **File Metadata Tracking:** Name, path, size, type, MIME type, upload status, entity linkage.

### Task Management

- **Tasks within Vaults** with title, description, assignment, priority, status tracking.
- **Subtask Hierarchy** via `parent_task_id` self-referencing foreign key.
- **Progress Tracking:** Per-task progress with automatic vault progress recalculation.
- **Time Tracking:** Estimated and actual hours fields.
- **Ordering:** Position-based ordering within projects.

### Comments & Chat ("Scribbles")

- **Real-time chat** within each vault workspace.
- **Polymorphic design** — comments can be attached to any entity type.
- **Threaded replies** via `parent_comment_id`.
- **@Mentions** with mentions array.
- **Edit Tracking:** Auto-detected and flagged via trigger.

### Collaborative Rich Text Editor

- **Quill.js** rich text editor with real-time collaboration.
- **Content Format:** Quill Delta (JSON) stored in `document_content` table.
- **Toolbar:** Headers (H1-H3), bold, italic, underline, strikethrough, ordered/bullet lists, text/background color, alignment, links, clean formatting.
- **Auto-Save:** Debounced at 1 second after last edit.
- **Manual Save & Download** as plain text.
- **Presence Tracking:** Shows active users with color-coded cursors, updated every 3 seconds.
- **Stale Presence Cleanup:** Automatically removes presence records older than 5 minutes.

### Whiteboard

- **HTML5 Canvas** drawing tool with retina display support (2x scaling).
- **Tools:** Select, Pen (3px ink stroke), Eraser (20px, composite `destination-out`).
- **Clear Board** function.
- **Drawing mode indicator** for current tool.

---

## Security & Access Control (RBAC)

### Authentication

- **Supabase Auth** with email/password authentication.
- **JWT-based sessions** with automatic token refresh.
- **Session persistence** across page reloads via localStorage.
- **Password reset** via email.
- **Auto-profile creation** on signup via database trigger (no frontend insertion needed).

### Two-Tier Role-Based Access Control

**1. Organization Level:**
| Role | Permissions |
|------|------------|
| **Admin** | Full control over organization, members, and projects |
| **User** | Can create/edit projects and tasks |
| **Moderator** | Extended read access and member management |
| **Guest** | Read-only access |

**2. Project Level (Direct Sharing):**
| Role | Permissions |
|------|------------|
| **Owner** | Full CRUD, delete vault, manage all collaborators |
| **Contributor** | Add/edit research, upload files, create comments and tasks |
| **Viewer** | Read-only access to all vault content |

### Row Level Security (RLS)

**40+ RLS policies** enforce access at the database level — not just the application layer. Every table has RLS enabled and forced. Key policies:

- **Users:** Public read for collaborator lists; update own record only.
- **Organizations:** Visible to owners and members; editable by owners only.
- **Organization Members:** SELECT via `user_is_org_member()` SECURITY DEFINER function (prevents RLS recursion).
- **Projects:** Visible if owned, public visibility, or organization/collaborator membership.
- **Tasks/Comments/Attachments:** Access based on project membership via `is_project_member()`.
- **Activity Logs:** Append-only — no UPDATE/DELETE policies (immutable audit trail).
- **Document Content/Presence/Operations:** Access if user is project owner or active collaborator.
- **Cache & Rate Limits:** Admin-only access; operations via SECURITY DEFINER functions.

### Rate Limiting & Throttling

- **`rate_limits` table** with per-endpoint tracking.
- **`check_rate_limit()` function** with configurable max requests and window duration.
- **Automatic cleanup** of expired rate limit entries.
- **Advisory locking** for vault-level concurrency control via `pg_try_advisory_lock`.

---

## Real-Time & Performance

### WebSocket Integration (Supabase Realtime)

Real-time subscriptions are enabled on **10 tables:**

| Table | Live Updates |
|-------|-------------|
| `projects` | Vault metadata changes appear instantly for all viewers |
| `tasks` | Task status/assignment changes broadcast to team |
| `comments` | Chat messages appear in real-time without refresh |
| `notifications` | Instant in-app notification delivery |
| `attachments` | Uploaded files appear immediately for collaborators |
| `organization_members` | Membership changes reflected instantly |
| `project_collaborators` | Collaborator additions/removals update in real-time |
| `document_content` | Live collaborative editing — other users' edits appear instantly |
| `document_presence` | Active user cursors and selections update every 3 seconds |
| `document_operations` | Versioned operation log for conflict resolution |

### Generic Realtime Hook

`useRealtimeSubscription` — a reusable hook that subscribes to Supabase Realtime postgres_changes on any table with optional column filtering, automatically invalidating related React Query caches on changes.

### Client-Side Caching (TanStack React Query)

- **Stale Time:** 5 minutes — data considered fresh, no refetch.
- **GC Time:** 10 minutes — unused cache entries retained.
- **Auto-Refetch:** On component mount, window focus, and network reconnect.
- **Notification Polling:** Every 30 seconds for unread notification count.
- **Optimistic Updates:** Query invalidation on mutations for instant UI feedback.

---

## Cloud Integration & File Management

### Supabase Storage (S3-Compatible)

- **Buckets:**
  - `avatars` — User profile photos (max 5MB, image/* only).
  - `attachments` — Research files (PDFs, documents, images, etc.).
- **Structured Paths:** `{user_id}/{entity_id}/{timestamp}.{ext}` for conflict-free uploads.
- **Public URL Generation:** Direct public URLs for serving files.
- **Upload Status Tracking:** `pending → uploading → completed / failed`.
- **File Metadata:** Size, type, MIME type, storage path all recorded in `attachments` table.

### Supabase Edge Functions

- **`send-collaboration-email`** — Deno-based edge function that sends HTML invitation emails via **Gmail SMTP** (port 587) when a collaborator is added to a vault. Includes project name, inviter name, and direct link to the project.

---

## Caching Strategy

SyncScript implements a **multi-layer caching architecture:**

### 1. Database-Level KV Cache
- **`cache` table** with key, value (JSONB), tags[], and TTL (expires_at).
- **Functions:** `cache_get()`, `cache_set()`, `cache_invalidate()`, `cache_invalidate_by_tag()`.
- **`cache_cleanup()`** removes expired entries and logs the operation.
- **`cache_stats()`** returns total/expired/active count, oldest/newest entry, total size.

### 2. Materialized View
- **`mv_project_stats`** aggregates task count, completed tasks, comment count, attachment count, and collaborator count per project.
- **`refresh_project_stats()`** refreshes concurrently (non-blocking).

### 3. Automatic Cache Invalidation
- **Trigger:** `trg_invalidate_project_cache` on the `projects` table automatically invalidates cache entries tagged with the modified project's ID.

### 4. Client-Side Caching
- **TanStack React Query** with 5-minute stale time, 10-minute GC time, and automatic cache invalidation on mutations and real-time events.

### 5. Scheduled Cleanup (pg_cron compatible)
- Hourly cache cleanup, 6-hourly session cleanup, 15-minute stats refresh.

---

## Edge Cases & Data Integrity

### Concurrency Control
- **Advisory Locks:** `acquire_vault_lock(project_id, user_id)` and `release_vault_lock(project_id)` using PostgreSQL's `pg_try_advisory_lock` to prevent simultaneous conflicting edits.

### Orphan Detection & Cleanup
- **`find_orphaned_comments()`** — Detects comments referencing soft-deleted entities.
- **`find_orphaned_attachments()`** — Detects attachments referencing soft-deleted entities.
- **`cleanup_orphaned_records()`** — Soft-deletes orphaned comments and attachments.

### Data Integrity Constraints
- **Date Validation:** Triggers ensure `due_date >= start_date` on projects and tasks.
- **File Size:** Positive file sizes enforced.
- **Progress Range:** 0-100 check constraints.
- **No Circular References:** Self-referencing parent_task_id cannot equal task id.
- **Unique Constraints:** Slug per owner, unique org memberships, unique collaborator entries.

### Duplicate Prevention
- **`prevent_duplicate_membership()`** trigger blocks duplicate active organization memberships.
- **Unique indexes** on (project_id, user_id) for collaborators and (organization_id, user_id) for members.

### RLS Recursion Prevention
- **`user_is_org_member()`** is a `SECURITY DEFINER` function that bypasses RLS to check organization membership without triggering recursive policy evaluation.

### Soft-Delete Views
Six active-only views filter out soft-deleted records:
`active_projects` · `active_tasks` · `active_comments` · `active_attachments` · `active_users` · `active_organizations`

---

## Notifications & Automation

### In-App Notifications
- **`notifications` table** with type (info/warning/error/success/update), read status, expiry.
- **Channels:** `in_app`, `email`, `sms` tracked via `sent_via` array.
- **Polling:** Client checks every 30 seconds for unread count.
- **Real-Time:** Subscribed via Supabase Realtime for instant delivery.

### Automated Triggers
- **Collaborator Added:** `trg_notify_collaborator_added` creates an in-app notification and logs the action when a member is added to an organization.
- **`notify_collaborator_added()`** function creates notifications + audit log entries on project sharing.
- **Email Notifications:** Edge function `send-collaboration-email` sends HTML invitation emails via Gmail SMTP.

### Webhook Support
- **Organization-level webhooks** with URL, secret signing, event filtering, custom headers, trigger statistics (total, failed).

---

## Pages & UI Components

### Pages

| Page | Route | Description |
|------|-------|-------------|
| **Landing Page** | `/` | Marketing page with hero section, feature showcase (Knowledge Vaults, Real-Time Sync, Role-Based Access), testimonials, pricing tiers (Student $0, Researcher $12/mo, Lab $49/mo), footer with newsletter. |
| **Login** | `/login` | Email/password sign-in with redirect to last attempted route. |
| **Register** | `/register` | Full name, email, password registration with auto-generated username. |
| **Dashboard** | `/dashboard` | Layout with sidebar navigation + nested routes. |
| **My Vaults** | `/dashboard` | Default view — lists owned vaults with search, color-coded cards, status indicators, context menus (favorite/delete). |
| **Favorites** | `/dashboard/favorites` | Starred vaults for quick access. |
| **New Vault** | `/dashboard/new-vault` | Create vault form with title, description, color picker. |
| **Vault Workspace** | `/dashboard/vault/:id` | **3-panel layout:** File sidebar (upload + file list) → Document viewer (FileViewer/CollaborativeEditor) → Researchers panel + real-time chat (Scribbles). |
| **Shared Research** | `/dashboard/shared` | Table of projects shared via organization membership with role badges. |
| **Whiteboard** | `/dashboard/whiteboard` | HTML5 Canvas drawing tool. |
| **Settings** | `/dashboard/settings` | Profile editing (avatar upload, name, username, bio), notification preferences, account deletion. |
| **404** | `*` | Custom not-found page with return link. |

### Key Components

| Component | Description |
|-----------|-------------|
| **CollaborativeEditor** | Quill.js rich text editor with real-time presence, auto-save, manual save/download, active user indicators. |
| **ManageAccessModal** | Project sharing modal — invite by email, role management (Owner/Contributor/Viewer), remove collaborators, email notifications. |
| **FileViewer** | Multi-format viewer: PDF (page navigation, zoom), Word (Office Online iframe + edit mode), images, download fallback. |
| **AppSidebar** | Navigation sidebar with user info, avatar, sign-out. Responsive (Sheet drawer on mobile, fixed on desktop). |
| **ThemeToggle** | Dark/Light mode toggle persisted to localStorage, respects system preference. |
| **ProtectedRoute** | Auth guard with skeleton loading state and redirect to login. |
| **SketchyCard / SketchyButton** | Custom hand-drawn styled components maintaining the notebook aesthetic. |

---

## Getting Started

### Prerequisites

- **Node.js 18+**
- **npm** (or yarn/bun)
- **Supabase account** — [supabase.com](https://supabase.com)

### Installation

```bash
# Clone the repository
git clone https://github.com/Supl3x/SyncScript2.0.git

# Navigate to project directory
cd SyncScript2.0

# Install dependencies
npm install

# Create .env file with your Supabase credentials
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# VITE_SUPABASE_ANON_KEY=your_anon_key

# Set up the database (see Database Setup below)

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Database Setup

Before running the app, you need to set up the Supabase database:

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Get your credentials** from Settings → API
3. **Create a `.env` file** with:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. **Run the database schema** - See [Database Setup Guide](./documents/DATABASE_SETUP.md) for detailed instructions

The database schema consists of 6 SQL files that must be executed in order:
- `database/schema.sql` - Core tables
- `database/functions.sql` - Helper functions
- `database/triggers.sql` - Automatic triggers
- `database/rls_policies.sql` - Security policies
- `database/caching.sql` - Caching utilities
- `database/edge_cases.sql` - Integrity constraints

### Build for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## Deployment

### Deploy to Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder to Netlify

### Deploy to GitHub Pages

1. Install gh-pages:
```bash
npm install --save-dev gh-pages
```

2. Add to package.json:
```json
"scripts": {
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

3. Deploy:
```bash
npm run deploy
```

## Project Structure

```
SyncScript/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   │   ├── useSupabase.ts        # Core database hooks
│   │   └── useSupabaseExtended.ts # Extended features hooks
│   ├── contexts/       # React contexts (Auth)
│   ├── lib/            # Utility functions
│   │   ├── supabase.ts          # Supabase client
│   │   └── database.types.ts    # TypeScript types
│   └── App.tsx         # Main app component
├── database/           # Database schema files
│   ├── schema.sql       # Core tables
│   ├── functions.sql    # Database functions
│   ├── triggers.sql     # Automatic triggers
│   ├── rls_policies.sql # Security policies
│   ├── caching.sql      # Caching utilities
│   └── edge_cases.sql   # Integrity constraints
├── documents/           # Documentation
│   ├── DATABASE_SETUP.md              # Database setup guide
│   ├── DATABASE_INTEGRATION_CHECKLIST.md # Integration checklist
│   └── INTEGRATION_SUMMARY.md         # Integration summary
├── public/             # Static assets
└── dist/              # Build output (generated)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Features Overview

### Knowledge Vaults
- Create, edit, and delete knowledge vaults (projects)
- Organize research with tags and colors
- Track progress and status
- Soft-delete for data recovery

### Collaboration
- Real-time comments/chat in vaults
- File attachments and uploads
- Organization-based sharing
- Role-based access control (owner, admin, user, guest)

### User Management
- Secure authentication via Supabase
- User profiles with extended data
- Activity logging and audit trails
- Session management

### Notifications
- In-app notifications
- Real-time updates
- Mark as read functionality

### Dark Theme
Toggle between light and dark modes using the button in the bottom-right corner of the dashboard.

### Favorites
Mark vaults as favorites using the three-dot menu on each vault card. Access all favorites from the sidebar.

### Settings
- Upload profile photo
- Update display name and title
- Configure preferences
- Save changes to database

### Loading Screen
Animated loading screen with progress bar that shows percentage completion.

## Database Documentation

For detailed information about the database:
- **[Database Setup Guide](./documents/DATABASE_SETUP.md)** - Step-by-step setup instructions
- **[Integration Checklist](./documents/DATABASE_INTEGRATION_CHECKLIST.md)** - Track integration progress
- **[Integration Summary](./documents/INTEGRATION_SUMMARY.md)** - Overview of what's been integrated

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

Project Link: [https://github.com/Supl3x/SyncScript2.0](https://github.com/Supl3x/SyncScript2.0)


Vercel Link: https://sync-script2-0.vercel.app/dashboard
