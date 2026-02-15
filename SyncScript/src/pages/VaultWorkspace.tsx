import { useState, useEffect } from "react";
import {
  FileText,
  Link2,
  Upload,
  Send,
  Plus,
  Paperclip,
  Share2,
  Sparkles,
} from "lucide-react";
import SketchyButton from "@/components/SketchyButton";
import BackButton from "@/components/BackButton";
import ManageAccessModal from "@/components/ManageAccessModal";
import FileViewer from "@/components/FileViewer";
import { useNavigate, useParams } from "react-router-dom";
import { useProject } from "@/hooks/useSupabase";
import { 
  useComments, 
  useCreateComment, 
  useAttachments, 
  useUploadFile,
  useProjectCollaborators 
} from "@/hooks/useSupabaseExtended";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useRealtimeSubscription } from "@/hooks/useSupabase";

export default function VaultWorkspace() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [showAccess, setShowAccess] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  // Database hooks
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: comments, isLoading: commentsLoading } = useComments('project', id);
  const { data: attachments, isLoading: attachmentsLoading } = useAttachments('project', id);
  const { data: collaborators } = useProjectCollaborators(id);
  const { mutate: createComment, isPending: creatingComment } = useCreateComment();
  const { mutate: uploadFile, isPending: uploading } = useUploadFile();

  // Subscribe to real-time updates
  useRealtimeSubscription(
    'project_collaborators',
    id ? { column: 'project_id', value: id } : undefined,
    () => {
      // Query will automatically refetch due to invalidation
    }
  );

  useRealtimeSubscription(
    'comments',
    id ? { column: 'entity_id', value: id } : undefined,
    () => {
      // Query will automatically refetch due to invalidation
    }
  );

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user || !id) return;

    createComment({
      content: chatInput,
      entity_type: 'project',
      entity_id: id,
      user_id: user.id,
    }, {
      onSuccess: () => {
        setChatInput("");
        toast.success("Comment added");
      },
      onError: (error: any) => {
        toast.error("Failed to send comment", {
          description: error.message,
        });
      },
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id || !user) return;

    uploadFile({
      file,
      entityType: 'project',
      entityId: id,
    }, {
      onSuccess: () => {
        toast.success("File uploaded successfully");
      },
      onError: (error: any) => {
        toast.error("Failed to upload file", {
          description: error.message,
        });
      },
    });
  };

  if (projectLoading) {
    return (
      <div className="animate-sketch-in p-8">
        <div className="text-center">
          <p className="font-sketch text-muted-foreground">Loading vault...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="animate-sketch-in p-8">
        <div className="text-center">
          <p className="font-sketch text-destructive">Vault not found</p>
          <SketchyButton variant="ghost" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </SketchyButton>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-sketch-in h-[calc(100vh-3rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BackButton label="" />
          <h1 className="text-2xl font-sketch text-foreground">{project.name}</h1>
        </div>
        <SketchyButton
          variant="default"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setShowAccess(true)}
        >
          <Share2 size={16} strokeWidth={2.5} />
          Share
        </SketchyButton>
      </div>

      {/* Share Modal */}
      {showAccess && (
        <ManageAccessModal
          projectId={id}
          project={project}
          onClose={() => setShowAccess(false)}
        />
      )}

      {/* 3-Column Layout */}
      <div className="flex gap-4 h-[calc(100%-3.5rem)]">
        {/* Left: Resources */}
        <div className="w-1/5 min-w-[200px] flex flex-col">
          <div className="sketchy-border bg-card p-3 flex-1 flex flex-col">
            <h3 className="text-lg font-sketch text-foreground mb-3 border-b-2 border-dashed border-ink/30 pb-2">
              Project Files
            </h3>
            <input
              type="file"
              className="hidden"
              id="file-upload"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <SketchyButton
              variant="dashed"
              size="sm"
              className="w-full flex items-center justify-center gap-2 mb-3"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={uploading}
            >
              <Upload size={16} strokeWidth={2.5} />
              {uploading ? "Uploading..." : "Upload"}
            </SketchyButton>

            <div className="flex-1 overflow-y-auto space-y-2">
              {attachmentsLoading ? (
                <p className="text-sm font-sketch text-muted-foreground text-center py-4">
                  Loading files...
                </p>
              ) : attachments && attachments.length > 0 ? (
                attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    onClick={() => setSelectedResource(attachment.id)}
                    className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded-[155px_10px_145px_10px/10px_145px_10px_155px] transition-all text-sm font-sketch ${
                      selectedResource === attachment.id
                        ? "bg-primary/10 border-2 border-ink shadow-sketch-sm"
                        : "hover:bg-paper-dark border-2 border-transparent"
                    }`}
                  >
                    {attachment.mime_type?.includes('pdf') ? (
                      <FileText size={16} strokeWidth={2.5} className="text-marker-red shrink-0" />
                    ) : (
                      <Link2 size={16} strokeWidth={2.5} className="text-marker-blue shrink-0" />
                    )}
                    <span className="truncate">{attachment.file_name}</span>
                  </button>
                ))
              ) : (
                <p className="text-sm font-sketch text-muted-foreground text-center py-4">
                  No files yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Center: Document viewer */}
        <div className="flex-1 flex flex-col">
          <div className="sketchy-border-alt bg-card flex-1 relative overflow-hidden">
            {/* Paperclip decoration */}
            <Paperclip
              size={32}
              strokeWidth={2}
              className="absolute -top-4 right-6 text-muted-foreground rotate-45 z-10"
            />

            {selectedResource ? (
              <div className="h-full p-4">
                {(() => {
                  const attachment = attachments?.find((a) => a.id === selectedResource);
                  if (!attachment) return null;
                  
                  return (
                    <FileViewer
                      fileUrl={attachment.file_path}
                      fileName={attachment.file_name}
                      mimeType={attachment.mime_type || ""}
                    />
                  );
                })()}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <FileText size={64} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-xl font-sketch text-muted-foreground">
                    Select a resource to view
                  </p>
                  <p className="text-sm font-sketch text-muted-foreground/60 mt-1">
                    Click on a file from the sidebar
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Collaboration */}
        <div className="w-1/4 min-w-[220px] flex flex-col gap-4">
          {/* Researchers */}
          <div className="sketchy-border bg-card p-3">
            <h3 className="text-base font-sketch text-foreground mb-3 border-b-2 border-dashed border-ink/30 pb-2">
              Researchers
            </h3>
            <div className="space-y-2">
              {collaborators && collaborators.length > 0 ? (
                collaborators.map((member: any) => {
                  const user = member.user;
                  const initials = user?.full_name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || user?.email?.[0].toUpperCase() || '?';
                  
                  return (
                    <div key={member.id} className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full border-2 border-ink bg-paper-dark flex items-center justify-center text-xs font-sketch">
                          {initials}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card bg-marker-green" />
                      </div>
                      <span className="text-sm font-sketch">
                        {user?.full_name || user?.email || 'Unknown'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm font-sketch text-muted-foreground">No collaborators yet</p>
              )}
              {/* Invite button */}
              <button
                onClick={() => setShowAccess(true)}
                className="w-8 h-8 rounded-full border-2 border-dashed border-ink flex items-center justify-center hover:bg-paper-dark transition-colors"
              >
                <Plus size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Chat / Field Notes */}
          <div className="sketchy-border-alt bg-card p-3 flex-1 flex flex-col">
            <h3 className="text-base font-sketch text-foreground mb-3 border-b-2 border-dashed border-ink/30 pb-2">
              Scribbles 💬
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 mb-3">
              {commentsLoading ? (
                <p className="text-sm font-sketch text-muted-foreground text-center py-4">
                  Loading comments...
                </p>
              ) : comments && comments.length > 0 ? (
                comments.map((comment: any) => {
                  const commentUser = comment.user || {};
                  const userName = commentUser.full_name || commentUser.email || 'Unknown';
                  
                  return (
                    <div key={comment.id} className="text-sm font-sketch">
                      <span className="font-bold text-foreground">{userName}: </span>
                      <span className="text-foreground">{comment.content}</span>
                      <span className="block text-xs text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm font-sketch text-muted-foreground text-center py-4">
                  No comments yet. Start the conversation!
                </p>
              )}
            </div>
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Write a note..."
                className="input-underline flex-1 text-sm"
                disabled={creatingComment}
              />
              <SketchyButton 
                variant="ghost" 
                size="sm" 
                type="submit"
                disabled={creatingComment || !chatInput.trim()}
              >
                <Send size={16} strokeWidth={2.5} />
              </SketchyButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
