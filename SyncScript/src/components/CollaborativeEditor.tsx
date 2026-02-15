import { useEffect, useRef, useState, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Save, Users, Download } from "lucide-react";
import SketchyButton from "./SketchyButton";
import { toast } from "sonner";

interface CollaborativeEditorProps {
  attachmentId: string;
  fileName: string;
  onClose?: () => void;
}

const USER_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52BE80"
];

export default function CollaborativeEditor({ 
  attachmentId, 
  fileName,
  onClose 
}: CollaborativeEditorProps) {
  const { user } = useAuth();
  const quillRef = useRef<ReactQuill>(null);
  const [content, setContent] = useState<any>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [userColor] = useState(() => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const presenceIntervalRef = useRef<NodeJS.Timeout>();

  // Load initial content
  useEffect(() => {
    loadDocument();
  }, [attachmentId]);

  // Setup realtime subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to document changes
    const contentChannel = supabase
      .channel(`document:${attachmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_content',
          filter: `attachment_id=eq.${attachmentId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            // Only update if change is from another user
            if (payload.new.last_edited_by !== user.id) {
              setContent(payload.new.content);
              if (quillRef.current) {
                const editor = quillRef.current.getEditor();
                const currentSelection = editor.getSelection();
                editor.setContents(payload.new.content);
                if (currentSelection) {
                  editor.setSelection(currentSelection);
                }
              }
            }
          }
        }
      )
      .subscribe();

    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel(`presence:${attachmentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_presence',
          filter: `attachment_id=eq.${attachmentId}`
        },
        async () => {
          await loadPresence();
        }
      )
      .subscribe();

    // Update presence every 3 seconds
    updatePresence();
    presenceIntervalRef.current = setInterval(updatePresence, 3000);

    // Cleanup on unmount
    return () => {
      contentChannel.unsubscribe();
      presenceChannel.unsubscribe();
      if (presenceIntervalRef.current) {
        clearInterval(presenceIntervalRef.current);
      }
      removePresence();
    };
  }, [attachmentId, user]);

  const loadDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('document_content')
        .select('content')
        .eq('attachment_id', attachmentId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setContent(data.content);
      } else {
        // Create new document
        const { error: insertError } = await supabase
          .from('document_content')
          .insert({
            attachment_id: attachmentId,
            content: { ops: [] },
            last_edited_by: user?.id
          });

        if (insertError) throw insertError;
        setContent({ ops: [] });
      }
    } catch (error: any) {
      console.error('Error loading document:', error);
      toast.error('Failed to load document');
    }
  };

  const loadPresence = async () => {
    try {
      const { data, error } = await supabase
        .from('document_presence')
        .select('*')
        .eq('attachment_id', attachmentId)
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      if (error) throw error;
      setActiveUsers(data || []);
    } catch (error) {
      console.error('Error loading presence:', error);
    }
  };

  const updatePresence = async () => {
    if (!user) return;

    try {
      const editor = quillRef.current?.getEditor();
      const selection = editor?.getSelection();

      await supabase.rpc('update_document_presence', {
        p_attachment_id: attachmentId,
        p_user_id: user.id,
        p_user_name: user.full_name || user.email || 'Anonymous',
        p_user_color: userColor,
        p_cursor_index: selection?.index || null,
        p_selection_length: selection?.length || null
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  const removePresence = async () => {
    if (!user) return;

    try {
      await supabase
        .from('document_presence')
        .delete()
        .eq('attachment_id', attachmentId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error removing presence:', error);
    }
  };

  const handleChange = useCallback((value: any, delta: any, source: any) => {
    if (source === 'user') {
      setContent(value);
      
      // Debounce save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(value);
      }, 1000); // Save after 1 second of inactivity
    }
  }, []);

  const saveDocument = async (contentToSave?: any) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const editor = quillRef.current?.getEditor();
      const delta = contentToSave || editor?.getContents();
      const plainText = editor?.getText() || '';

      const { error } = await supabase
        .from('document_content')
        .upsert({
          attachment_id: attachmentId,
          content: delta,
          plain_text: plainText,
          last_edited_by: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'attachment_id'
        });

      if (error) throw error;

      setLastSaved(new Date());
      toast.success('Saved', { duration: 1000 });
    } catch (error: any) {
      console.error('Error saving document:', error);
      toast.error('Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    const editor = quillRef.current?.getEditor();
    const text = editor?.getText() || '';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.[^/.]+$/, '.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  };

  if (content === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="font-sketch text-muted-foreground">Loading document...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sketchy-border-sm bg-card p-2 mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-sketch truncate">{fileName}</span>
          {isSaving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          {lastSaved && !isSaving && (
            <span className="text-xs text-muted-foreground">
              Saved {formatDistanceToNow(lastSaved)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Active Users */}
          <div className="flex items-center gap-1">
            <Users size={16} className="text-muted-foreground" />
            <span className="text-xs font-sketch">{activeUsers.length}</span>
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 5).map((u) => (
                <div
                  key={u.user_id}
                  className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-xs font-sketch text-white"
                  style={{ backgroundColor: u.user_color }}
                  title={u.user_name}
                >
                  {u.user_name?.[0]?.toUpperCase() || '?'}
                </div>
              ))}
            </div>
          </div>

          <SketchyButton variant="ghost" size="sm" onClick={() => saveDocument()}>
            <Save size={16} />
          </SketchyButton>
          <SketchyButton variant="ghost" size="sm" onClick={handleDownload}>
            <Download size={16} />
          </SketchyButton>
          {onClose && (
            <SketchyButton variant="ghost" size="sm" onClick={onClose}>
              Close
            </SketchyButton>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={handleChange}
          modules={modules}
          className="h-full"
          style={{ height: 'calc(100% - 42px)' }}
        />
      </div>
    </div>
  );
}

function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
