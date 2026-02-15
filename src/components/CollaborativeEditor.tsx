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
            onEdit(fileId, newContent);
        }
    }, [fileId, onEdit]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="font-sketch text-muted-foreground animate-pulse">Loading document...</p>
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
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-marker-green/15 border border-marker-green/30">
                        <Wifi size={12} className="text-marker-green animate-pulse" />
                        <span className="text-[11px] font-sketch font-bold text-marker-green">LIVE</span>
                    </div>

                    {/* Users editing this file */}
                    {editingUsers.length > 0 && (
                        <div className="flex items-center gap-1 ml-1">
                            <Users size={14} className="text-muted-foreground" />
                            <div className="flex -space-x-1.5">
                                {editingUsers.map(u => (
                                    <div
                                        key={u.userId}
                                        className="w-6 h-6 rounded-full border-2 border-card text-[10px] flex items-center justify-center font-bold text-white shadow-sm"
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
                placeholder="Start typing... changes sync in real-time ✨"
                style={{ tabSize: 2 }}
            />
        </div>
    );
}
