# 🔴 Real-Time Collaborative Editing — Implementation Guide

> **Deadline: 1:30 PM today** | **Stack: React + Supabase Realtime (Broadcast + Presence)** | **No database changes needed**

---

## What We're Building

Multiple users open the same file in a vault and edit it simultaneously — edits sync live like Google Docs. We use **Supabase Realtime Channels** (already included in `@supabase/supabase-js`).

```
User A types → Broadcast via Supabase Channel → User B/C see changes instantly
```

---

## Architecture Overview

| Feature | Supabase Realtime API | Purpose |
|---|---|---|
| **Who's online** | `Presence` | Show active users in the Researchers panel |
| **Live text sync** | `Broadcast` | Send/receive document edits in real-time |
| **Cursor position** | `Broadcast` | Show where each user's cursor is |

**Channel naming**: `vault:{vaultId}` — one channel per vault.

---

## Files to Create/Modify

### 1. 🆕 `src/hooks/useRealtimeCollaboration.ts`

This is the core hook. Copy this structure:

```typescript
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Types
interface OnlineUser {
  userId: string;
  email: string;
  fullName: string;
  activeFileId: string | null;
  cursor?: { line: number; ch: number };
  color: string;
  joinedAt: string;
}

interface BroadcastPayload {
  type: 'content_update' | 'cursor_update' | 'file_select';
  fileId: string;
  content?: string;
  cursor?: { line: number; ch: number };
  userId: string;
}

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

export function useRealtimeCollaboration(vaultId: string | undefined) {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [remoteContent, setRemoteContent] = useState<string | null>(null);
  const [remoteFileId, setRemoteFileId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!vaultId || !user) return;

    // Create channel
    const channel = supabase.channel(`vault:${vaultId}`, {
      config: { broadcast: { self: false } }, // don't receive own broadcasts
    });

    // ── PRESENCE: track who's online ──
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<OnlineUser>();
      const users: OnlineUser[] = [];
      Object.values(state).forEach((presences: any[]) => {
        presences.forEach((p) => users.push(p));
      });
      setOnlineUsers(users);
    });

    // ── BROADCAST: receive remote edits ──
    channel.on('broadcast', { event: 'doc_edit' }, ({ payload }) => {
      const data = payload as BroadcastPayload;
      if (data.userId === user.id) return; // ignore own edits
      if (data.type === 'content_update' && data.content !== undefined) {
        setRemoteContent(data.content);
        setRemoteFileId(data.fileId);
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const colorIndex = user.id.charCodeAt(0) % USER_COLORS.length;
        await channel.track({
          userId: user.id,
          email: user.email || '',
          fullName: profile?.full_name || user.email || 'Anonymous',
          activeFileId: null,
          color: USER_COLORS[colorIndex],
          joinedAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [vaultId, user, profile]);

  // ── Send edit to others ──
  const broadcastEdit = useCallback((fileId: string, content: string) => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'doc_edit',
      payload: {
        type: 'content_update',
        fileId,
        content,
        userId: user.id,
      } as BroadcastPayload,
    });
  }, [user]);

  // ── Update active file in presence ──
  const updateActiveFile = useCallback(async (fileId: string | null) => {
    if (!channelRef.current || !user) return;
    const colorIndex = user.id.charCodeAt(0) % USER_COLORS.length;
    await channelRef.current.track({
      userId: user.id,
      email: user.email || '',
      fullName: profile?.full_name || user.email || 'Anonymous',
      activeFileId: fileId,
      color: USER_COLORS[colorIndex],
      joinedAt: new Date().toISOString(),
    });
  }, [user, profile]);

  return {
    onlineUsers,
    remoteContent,
    remoteFileId,
    broadcastEdit,
    updateActiveFile,
  };
}
```

---

### 2. 🆕 `src/components/CollaborativeEditor.tsx`

An editable textarea that sends/receives changes:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { FileCode, Users, Wifi } from 'lucide-react';

interface CollaborativeEditorProps {
  fileUrl: string;
  fileName: string;
  fileId: string;
  remoteContent: string | null;
  remoteFileId: string | null;
  onEdit: (fileId: string, content: string) => void;
  onlineUsers: { userId: string; fullName: string; color: string; activeFileId: string | null }[];
}

export default function CollaborativeEditor({
  fileUrl, fileName, fileId,
  remoteContent, remoteFileId,
  onEdit, onlineUsers,
}: CollaborativeEditorProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRemoteUpdate = useRef(false);

  // Count users editing this same file
  const editingUsers = onlineUsers.filter(u => u.activeFileId === fileId);

  // Load initial file content
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(fileUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        return res.text();
      })
      .then(text => { if (!cancelled) { setContent(text); setLoading(false); } })
      .catch(err => { if (!cancelled) { setError(err.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [fileUrl]);

  // Apply remote edits
  useEffect(() => {
    if (remoteContent !== null && remoteFileId === fileId) {
      const textarea = textareaRef.current;
      const cursorPos = textarea?.selectionStart || 0;

      isRemoteUpdate.current = true;
      setContent(remoteContent);

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        if (textarea) {
          const newPos = Math.min(cursorPos, remoteContent.length);
          textarea.setSelectionRange(newPos, newPos);
        }
        isRemoteUpdate.current = false;
      });
    }
  }, [remoteContent, remoteFileId, fileId]);

  // Handle local typing
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (!isRemoteUpdate.current) {
      onEdit(fileId, newContent); // broadcast to others
    }
  }, [fileId, onEdit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-sketch text-muted-foreground">Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-sketch text-destructive">{error}</p>
      </div>
    );
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';

  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="flex items-center gap-2 p-3 pb-2 border-b-2 border-dashed border-ink/20 sticky top-0 bg-card z-10">
        <FileCode size={18} strokeWidth={2.5} className="text-marker-blue" />
        <span className="font-sketch text-sm text-foreground font-bold truncate">{fileName}</span>
        <span className="text-xs font-sketch text-muted-foreground">.{ext}</span>

        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-2">
          <Wifi size={14} className="text-marker-green animate-pulse" />
          <span className="text-xs font-sketch text-marker-green">LIVE</span>

          {/* Users editing this file */}
          {editingUsers.length > 0 && (
            <div className="flex items-center gap-1 ml-2">
              <Users size={14} className="text-muted-foreground" />
              <div className="flex -space-x-1">
                {editingUsers.map(u => (
                  <div
                    key={u.userId}
                    className="w-5 h-5 rounded-full border border-card text-[10px] flex items-center justify-center font-bold text-white"
                    style={{ backgroundColor: u.color }}
                    title={u.fullName}
                  >
                    {u.fullName[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editable textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        spellCheck={false}
        className="flex-1 w-full p-4 bg-transparent text-foreground font-mono text-sm leading-relaxed resize-none outline-none border-none focus:ring-0"
        placeholder="Start typing..."
        style={{ tabSize: 2 }}
      />
    </div>
  );
}
```

---

### 3. ✏️ Modify `src/components/FileViewer.tsx`

In `FileViewer.tsx`, add these new props and update the `text` rendering branch:

**Add new props to the interface:**
```diff
 interface FileViewerProps {
   fileUrl: string;
   fileName: string;
   mimeType: string;
+  fileId?: string;
+  remoteContent?: string | null;
+  remoteFileId?: string | null;
+  onEdit?: (fileId: string, content: string) => void;
+  onlineUsers?: { userId: string; fullName: string; color: string; activeFileId: string | null }[];
 }
```

**Replace the `text` category rendering** (the `if (category === "text")` block) with:
```tsx
if (category === "text") {
  // If collaboration props are provided, use CollaborativeEditor
  if (props.fileId && props.onEdit) {
    return (
      <CollaborativeEditor
        fileUrl={fileUrl}
        fileName={fileName}
        fileId={props.fileId}
        remoteContent={props.remoteContent ?? null}
        remoteFileId={props.remoteFileId ?? null}
        onEdit={props.onEdit}
        onlineUsers={props.onlineUsers ?? []}
      />
    );
  }
  // Fallback to read-only (existing code stays as-is)
  // ...existing <pre> rendering...
}
```

> Remember to `import CollaborativeEditor from "@/components/CollaborativeEditor"` at the top.

---

### 4. ✏️ Modify `src/pages/VaultWorkspace.tsx`

**Add the hook** at the top of the component:
```tsx
import { useRealtimeCollaboration } from '@/hooks/useRealtimeCollaboration';

// Inside VaultWorkspace():
const {
  onlineUsers,
  remoteContent,
  remoteFileId,
  broadcastEdit,
  updateActiveFile,
} = useRealtimeCollaboration(id);
```

**When selecting a file**, call `updateActiveFile`:
```tsx
// In the file button onClick:
onClick={() => {
  setSelectedResource(attachment.id);
  updateActiveFile(attachment.id);  // ← ADD THIS
}}
```

**Pass collaboration props to FileViewer:**
```tsx
<FileViewer
  key={att.id}
  fileUrl={att.file_path}
  fileName={att.file_name}
  mimeType={att.mime_type || ''}
  fileId={att.id}                    // ← ADD
  remoteContent={remoteContent}       // ← ADD
  remoteFileId={remoteFileId}          // ← ADD
  onEdit={broadcastEdit}              // ← ADD
  onlineUsers={onlineUsers}           // ← ADD
/>
```

**Update the Researchers panel** to show live `onlineUsers`:
```tsx
{/* Replace the existing collaborators.map with: */}
{onlineUsers.length > 0 ? (
  onlineUsers.map((u) => (
    <div key={u.userId} className="flex items-center gap-2">
      <div className="relative">
        <div
          className="w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center text-xs font-sketch text-white font-bold"
          style={{ backgroundColor: u.color }}
        >
          {u.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card bg-marker-green" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-sketch">{u.fullName}</span>
        {u.activeFileId && (
          <span className="text-[10px] font-sketch text-muted-foreground">editing...</span>
        )}
      </div>
    </div>
  ))
) : (
  /* keep existing collaborators rendering as fallback */
)}
```

---

## Testing

1. `npm run dev`
2. Open `http://localhost:8080` in **two browser tabs** (or two different browsers)
3. Log in with **two different accounts**
4. Open the same vault → upload a `.txt` or `.md` file
5. Click the file in both tabs → type in one → should appear in the other

---

## Supabase Dashboard Setup (if not done)

Make sure Realtime is enabled on your Supabase project:
1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Under **Realtime**, ensure it's **enabled** (it is by default)
3. No database tables or RLS changes needed — Broadcast/Presence don't use Postgres

---

## Time Estimate

| Task | Estimate |
|---|---|
| Create `useRealtimeCollaboration.ts` | 15 min |
| Create `CollaborativeEditor.tsx` | 15 min |
| Modify `FileViewer.tsx` | 10 min |
| Modify `VaultWorkspace.tsx` | 15 min |
| Testing & debug | 20 min |
| **Total** | **~1 hour 15 min** |
