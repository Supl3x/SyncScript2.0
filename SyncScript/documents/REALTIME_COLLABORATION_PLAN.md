# Real-Time Collaborative Editing Implementation Plan

## Overview
This document outlines how to implement Google Sheets-like real-time collaboration for documents in SyncScript.

---

## Architecture Options

### Option A: Yjs + TipTap (Recommended for Rich Text)
**Best for:** Word-like documents with formatting

**Stack:**
- **Yjs**: CRDT library for conflict-free collaboration
- **TipTap**: Modern rich text editor (built on ProseMirror)
- **y-supabase**: Yjs provider for Supabase Realtime
- **y-prosemirror**: Yjs binding for TipTap/ProseMirror

**Pros:**
- Automatic conflict resolution
- Offline support
- Proven at scale (used by Notion, Linear)
- Rich text formatting
- Easy to implement

**Cons:**
- Larger bundle size
- Learning curve for Yjs

---

### Option B: Yjs + Monaco Editor (For Code/Plain Text)
**Best for:** Code files, plain text, markdown

**Stack:**
- **Yjs**: CRDT library
- **Monaco Editor**: VS Code's editor
- **y-monaco**: Yjs binding for Monaco

**Pros:**
- Syntax highlighting
- Code completion
- Great for technical documents

**Cons:**
- Not ideal for rich text formatting

---

### Option C: Custom Implementation with Supabase Realtime
**Best for:** Simple text editing without complex formatting

**Stack:**
- **Supabase Realtime**: WebSocket broadcasting
- **Simple textarea or contenteditable**
- **Custom conflict resolution**

**Pros:**
- Full control
- Smaller bundle size
- No external dependencies

**Cons:**
- Must handle conflicts manually
- More complex to implement
- Prone to bugs

---

## Recommended Implementation: Yjs + TipTap

### Phase 1: Setup Dependencies

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-collaboration @tiptap/extension-collaboration-cursor
npm install yjs y-supabase y-prosemirror
npm install @supabase/realtime-js
```

### Phase 2: Database Schema Updates

Add a new table for document content:

```sql
-- Document content stored as Yjs updates
CREATE TABLE IF NOT EXISTS public.document_content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attachment_id   UUID NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  content         JSONB NOT NULL DEFAULT '{}',
  yjs_state       BYTEA,  -- Yjs document state
  version         INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (attachment_id)
);

-- Presence tracking for active editors
CREATE TABLE IF NOT EXISTS public.document_presence (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attachment_id   UUID NOT NULL REFERENCES public.attachments(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cursor_position JSONB,
  selection       JSONB,
  last_seen       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (attachment_id, user_id)
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_presence;

-- RLS Policies
ALTER TABLE public.document_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_presence ENABLE ROW LEVEL SECURITY;

-- Users can read/write documents they have access to
CREATE POLICY document_content_access ON public.document_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.attachments a
      JOIN public.projects p ON a.entity_id = p.id
      WHERE a.id = attachment_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.is_active = TRUE
          )
        )
    )
  );

CREATE POLICY document_presence_access ON public.document_presence
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.attachments a
      JOIN public.projects p ON a.entity_id = p.id
      WHERE a.id = attachment_id
        AND (
          p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.is_active = TRUE
          )
        )
    )
  );
```

### Phase 3: Create Collaborative Editor Component

```typescript
// src/components/CollaborativeEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { SupabaseProvider } from 'y-supabase';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CollaborativeEditorProps {
  attachmentId: string;
  projectId: string;
  readOnly?: boolean;
}

export default function CollaborativeEditor({ 
  attachmentId, 
  projectId,
  readOnly = false 
}: CollaborativeEditorProps) {
  const { user } = useAuth();
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<SupabaseProvider | null>(null);
  const [collaborators, setCollaborators] = useState<any[]>([]);

  useEffect(() => {
    // Initialize Yjs provider with Supabase
    const supabaseProvider = new SupabaseProvider(
      ydoc,
      supabase,
      {
        channel: `document:${attachmentId}`,
        tableName: 'document_content',
        columnName: 'yjs_state',
        id: attachmentId,
      }
    );

    setProvider(supabaseProvider);

    // Subscribe to presence
    const presenceChannel = supabase.channel(`presence:${attachmentId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setCollaborators(Object.values(state).flat());
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: user?.id,
            user_name: user?.full_name || user?.email,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabaseProvider.destroy();
      presenceChannel.unsubscribe();
    };
  }, [attachmentId, ydoc, user]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Yjs handles history
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider: provider,
        user: {
          name: user?.full_name || user?.email || 'Anonymous',
          color: getRandomColor(),
        },
      }),
    ],
    editable: !readOnly,
  });

  return (
    <div className="collaborative-editor">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <button onClick={() => editor?.chain().focus().toggleBold().run()}>
          Bold
        </button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()}>
          Italic
        </button>
        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </button>
        {/* Add more toolbar buttons */}
      </div>

      {/* Active Collaborators */}
      <div className="collaborators">
        {collaborators.map((collab: any) => (
          <div key={collab.user_id} className="collaborator-avatar">
            {collab.user_name?.[0] || '?'}
          </div>
        ))}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}

function getRandomColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
  return colors[Math.floor(Math.random() * colors.length)];
}
```

### Phase 4: Update FileViewer Component

```typescript
// Add to FileViewer.tsx
import CollaborativeEditor from './CollaborativeEditor';

// In FileViewer component, add condition for editable documents:
if (
  mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
  mimeType === "application/msword" ||
  fileName.toLowerCase().endsWith(".docx") ||
  fileName.toLowerCase().endsWith(".doc")
) {
  // Check if user wants to edit or just view
  const [editMode, setEditMode] = useState(false);
  
  if (editMode) {
    return (
      <CollaborativeEditor 
        attachmentId={attachmentId}
        projectId={projectId}
        readOnly={false}
      />
    );
  }
  
  // Otherwise show Office viewer (read-only)
  return (
    <div className="flex flex-col h-full">
      <div className="sketchy-border-sm bg-card p-2 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={20} className="text-marker-blue" />
          <span className="text-sm font-sketch truncate">{fileName}</span>
        </div>
        <div className="flex gap-2">
          <SketchyButton variant="ghost" size="sm" onClick={() => setEditMode(true)}>
            Edit
          </SketchyButton>
          <SketchyButton variant="ghost" size="sm" onClick={handleDownload}>
            <Download size={16} />
          </SketchyButton>
        </div>
      </div>
      {/* Office viewer iframe */}
    </div>
  );
}
```

---

## Phase 5: Features to Implement

### 1. Presence Indicators
- Show active users with colored avatars
- Display cursor positions
- Show who's typing

### 2. Version History
- Save snapshots periodically
- Allow reverting to previous versions
- Show diff between versions

### 3. Comments & Annotations
- Inline comments on specific text
- Resolved/unresolved status
- @mentions

### 4. Permissions
- Read-only vs edit access
- Suggest mode (like Google Docs)
- Admin can lock document

### 5. Conflict Resolution
- Yjs handles this automatically
- Show merge conflicts if any
- Undo/redo across users

---

## Alternative: Simpler Approach for MVP

If full collaborative editing is too complex initially, start with:

### 1. Lock-Based Editing
- Only one user can edit at a time
- Others see "User X is editing" message
- Simpler to implement

### 2. Turn-Based Editing
- Users take turns editing
- Changes saved on blur/save button
- Real-time view updates via Supabase Realtime

### 3. Section-Based Locking
- Lock specific paragraphs/sections
- Multiple users can edit different sections
- Merge on save

---

## Implementation Timeline

### Week 1: Setup & Basic Editor
- Install dependencies
- Create database tables
- Basic TipTap editor without collaboration

### Week 2: Add Yjs Integration
- Integrate Yjs with TipTap
- Setup Supabase provider
- Test with 2 users

### Week 3: Presence & Cursors
- Add presence tracking
- Show active users
- Display cursor positions

### Week 4: Polish & Features
- Toolbar improvements
- Version history
- Comments system

---

## Testing Strategy

1. **Local Testing**: Open 2 browser windows, different users
2. **Network Testing**: Test with slow connections
3. **Conflict Testing**: Type simultaneously in same location
4. **Offline Testing**: Disconnect, make changes, reconnect
5. **Scale Testing**: 10+ users editing simultaneously

---

## Resources

- **Yjs Documentation**: https://docs.yjs.dev/
- **TipTap Documentation**: https://tiptap.dev/
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
- **y-supabase**: https://github.com/yousefed/y-supabase
- **Example Apps**: 
  - https://github.com/yousefed/SyncedStore
  - https://github.com/ueberdosis/tiptap-collab

---

## Cost Considerations

- **Supabase Realtime**: Free tier includes 200 concurrent connections
- **Storage**: Yjs state is binary, efficient storage
- **Bandwidth**: Real-time updates are small (few KB per change)

---

## Security Considerations

1. **RLS Policies**: Ensure only authorized users can edit
2. **Rate Limiting**: Prevent spam/abuse
3. **Input Validation**: Sanitize content
4. **Audit Trail**: Log all changes with user info

---

## Next Steps

1. **Decide on approach**: Full Yjs or simpler lock-based?
2. **Install dependencies**: Run npm install commands
3. **Create database tables**: Run SQL migrations
4. **Build basic editor**: Start with non-collaborative version
5. **Add collaboration**: Integrate Yjs step by step
6. **Test thoroughly**: Multiple users, edge cases
7. **Deploy**: Test in production environment

Would you like me to start implementing this? Let me know which approach you prefer!
