import { useState, useEffect } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import SketchyButton from "@/components/SketchyButton";
import { useAuth } from "@/contexts/AuthContext";
import {
  useProjectCollaborators,
  useAddProjectCollaborator,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
} from "@/hooks/useSupabaseExtended";
import { useRealtimeSubscription } from "@/hooks/useSupabase";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Project } from "@/lib/database.types";

interface ManageAccessModalProps {
  projectId: string | undefined;
  project: Project | undefined;
  onClose: () => void;
}

const roles = ["Owner", "Contributor", "Viewer"] as const;
type Role = typeof roles[number];

const roleColors = {
  Owner: "bg-marker-red/15 text-foreground",
  Contributor: "bg-marker-blue/15 text-foreground",
  Viewer: "bg-muted text-muted-foreground",
};

// Map database roles to UI roles
const mapDbRoleToUI = (role: string): Role => {
  if (role === 'owner') return 'Owner';
  if (role === 'contributor') return 'Contributor';
  return 'Viewer';
};

const mapUIRoleToDb = (role: Role): 'owner' | 'contributor' | 'viewer' => {
  if (role === 'Owner') return 'owner';
  if (role === 'Contributor') return 'contributor';
  return 'viewer';
};

export default function ManageAccessModal({ projectId, project, onClose }: ManageAccessModalProps) {
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data: collaborators, isLoading } = useProjectCollaborators(projectId);
  const addCollaborator = useAddProjectCollaborator();
  const updateRole = useUpdateCollaboratorRole();
  const removeCollaborator = useRemoveCollaborator();

  // Subscribe to real-time updates for project_collaborators
  useRealtimeSubscription(
    'project_collaborators',
    projectId ? { column: 'project_id', value: projectId } : undefined,
    (payload) => {
      console.log('Collaborator update:', payload);
      // Query will automatically refetch due to invalidation
    }
  );

  // Get owner info
  const [owner, setOwner] = useState<any>(null);

  useEffect(() => {
    const fetchOwner = async () => {
      if (project?.owner_id) {
        const { data } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url, username')
          .eq('id', project.owner_id)
          .single();
        
        if (data) {
          setOwner({
            ...data,
            role: 'Owner' as Role,
            isOwner: true,
          });
        }
      }
    };

    fetchOwner();
  }, [project]);

  // Combine owner and collaborators
  const allMembers = owner
    ? [
        owner,
        ...(collaborators || []).map((collab: any) => ({
          id: collab.id,
          user_id: collab.user_id || collab.user?.id,
          name: collab.user?.full_name || collab.user?.username || 'Unknown',
          email: collab.user?.email || '',
          avatar_url: collab.user?.avatar_url,
          role: mapDbRoleToUI(collab.role || 'viewer'),
          isOwner: false,
        })),
      ]
    : (collaborators || []).map((collab: any) => ({
        id: collab.id,
        user_id: collab.user_id || collab.user?.id,
        name: collab.user?.full_name || collab.user?.username || 'Unknown',
        email: collab.user?.email || '',
        avatar_url: collab.user?.avatar_url,
        role: mapDbRoleToUI(collab.role || 'viewer'),
        isOwner: false,
      }));

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !projectId || !user) return;

    setIsInviting(true);
    setErrorMessage("");

    try {
      await addCollaborator.mutateAsync({
        projectId,
        email: inviteEmail.trim(),
        role: 'viewer',
        invitedBy: user.id,
      });

      toast.success("Collaborator added", {
        description: "The user has been added and notified via email",
      });
      setInviteEmail("");
    } catch (error: any) {
      const message = error.message || "Failed to add collaborator";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: Role) => {
    if (!projectId || !memberId) return;

    try {
      await updateRole.mutateAsync({
        collaboratorId: memberId,
        role: mapUIRoleToDb(newRole),
        projectId,
      });
      toast.success("Role updated");
    } catch (error: any) {
      toast.error("Failed to update role", {
        description: error.message,
      });
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    if (!projectId || !memberId) return;
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;

    try {
      await removeCollaborator.mutateAsync({
        collaboratorId: memberId,
        projectId,
      });
      toast.success("Collaborator removed");
    } catch (error: any) {
      toast.error("Failed to remove collaborator", {
        description: error.message,
      });
    }
  };

  const isProjectOwner = user?.id === project?.owner_id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <div
        className="sketchy-border bg-card w-full max-w-lg p-6 animate-sketch-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-sketch text-foreground">Manage Team 📋</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-destructive transition-colors"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        {/* Members list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {allMembers.length === 0 ? (
              <p className="text-sm font-sketch text-muted-foreground text-center py-4">
                No collaborators yet
              </p>
            ) : (
              allMembers.map((member: any) => {
                const memberId = member.id || member.user_id;
                const isOwner = member.isOwner || member.role === 'Owner';
                const canEdit = isProjectOwner && !isOwner;

                return (
                  <div
                    key={memberId}
                    className="flex items-center gap-3 px-3 py-2 border-b-2 border-dashed border-ink/15"
                  >
                    <div className="w-9 h-9 rounded-full border-2 border-ink bg-paper-dark flex items-center justify-center text-sm font-sketch shrink-0 overflow-hidden">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(member.name, member.email)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sketch text-foreground truncate">
                        {member.name || member.email}
                      </p>
                      <p className="text-xs font-sketch text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    {canEdit ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(memberId, e.target.value as Role)
                          }
                          className={`font-sketch text-sm px-3 py-1 border-2 border-ink rounded-[155px_10px_145px_10px/10px_145px_10px_155px] cursor-pointer ${roleColors[member.role]}`}
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemove(memberId, member.name || member.email)}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                          title="Remove"
                        >
                          <X size={16} strokeWidth={3} />
                        </button>
                      </>
                    ) : (
                      <span
                        className={`font-sketch text-sm px-3 py-1 border-2 border-ink rounded-[155px_10px_145px_10px/10px_145px_10px_155px] ${roleColors[member.role]}`}
                      >
                        {member.role}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Invite section - only show if user is project owner */}
        {isProjectOwner && (
          <div className="border-2 border-dashed border-ink/30 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus size={18} strokeWidth={2.5} />
              <span className="font-sketch text-foreground">Invite New Researcher</span>
            </div>
            <form onSubmit={handleInvite} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setErrorMessage("");
                }}
                placeholder="researcher@university.edu"
                className="input-underline flex-1 text-sm"
                disabled={isInviting}
              />
              <SketchyButton
                variant="primary"
                size="sm"
                type="submit"
                disabled={isInviting || !inviteEmail.trim()}
              >
                {isInviting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  "Invite"
                )}
              </SketchyButton>
            </form>
            {errorMessage && (
              <p className="text-xs font-sketch text-destructive mt-2">{errorMessage}</p>
            )}
          </div>
        )}

        {/* Permissions note */}
        <p className="text-xs font-sketch text-muted-foreground mt-4 text-center italic">
          ✏️ Owners can delete • Contributors can edit • Viewers can read only
        </p>
      </div>
    </div>
  );
}
