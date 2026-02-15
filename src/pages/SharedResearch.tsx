import { FolderOpen, Clock, X } from "lucide-react";
import BackButton from "@/components/BackButton";
import { useSharedProjects } from "@/hooks/useSupabaseExtended";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const roleBadge: Record<string, string> = {
  owner: "bg-marker-red/15 border-marker-red/40",
  admin: "bg-marker-blue/15 border-marker-blue/40",
  user: "bg-marker-blue/15 border-marker-blue/40",
  moderator: "bg-marker-yellow/15 border-marker-yellow/40",
  guest: "bg-muted border-muted-foreground/30",
  Viewer: "bg-muted border-muted-foreground/30",
  Contributor: "bg-marker-blue/15 border-marker-blue/40",
};

export default function SharedResearch() {
  const navigate = useNavigate();
  const { data: sharedProjects, isLoading, error } = useSharedProjects();
  return (
    <div className="animate-sketch-in">
      <BackButton label="Back to Dashboard" />
      <div className="mb-8">
        <h1 className="text-3xl font-sketch text-foreground">Shared with Me 🤝</h1>
        <p className="text-muted-foreground font-sketch">
          Research vaults others have shared with you
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="sketchy-border bg-card p-12 text-center">
          <p className="text-xl font-sketch text-destructive mb-2">
            Error loading shared projects
          </p>
          <p className="text-sm font-sketch text-muted-foreground/60">
            {(error as any)?.message || "Please try refreshing the page"}
          </p>
        </div>
      ) : sharedProjects && sharedProjects.length > 0 ? (
        <div className="sketchy-border bg-card overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b-2 border-ink/20 text-sm font-sketch text-muted-foreground">
            <span>Project</span>
            <span>Owner</span>
            <span>Role</span>
            <span>Last Active</span>
            <span></span>
          </div>

          {sharedProjects.map((vault: any, i: number) => {
            const owner = vault.owner || {};
            const ownerName = owner.full_name || owner.email?.split('@')[0] || 'Unknown';
            const ownerInitials = ownerName
              .split(' ')
              .map((w: string) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U';
            const role = vault.role || 'user';
            const lastActive = vault.updated_at 
              ? formatDistanceToNow(new Date(vault.updated_at), { addSuffix: true })
              : 'Never';

            return (
              <div
                key={vault.id}
                onClick={() => navigate(`/dashboard/vault/${vault.id}`)}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 items-center hover:bg-paper-dark transition-colors cursor-pointer ${
                  i < sharedProjects.length - 1 ? "border-b-2 border-dashed border-ink/10" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={18} strokeWidth={2.5} className="text-marker-blue shrink-0" />
                  <span className="font-sketch text-foreground">{vault.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-sketch text-muted-foreground">
                  <div className="w-6 h-6 rounded-full border-2 border-ink bg-paper-dark flex items-center justify-center text-[10px]">
                    {ownerInitials}
                  </div>
                  {ownerName}
                </div>
                <span
                  className={`inline-block text-xs font-sketch px-2 py-0.5 border rounded-[155px_10px_145px_10px/10px_145px_10px_155px] w-fit capitalize ${
                    roleBadge[role] || roleBadge['user']
                  }`}
                >
                  {role}
                </span>
                <div className="flex items-center gap-1 text-xs font-sketch text-muted-foreground">
                  <Clock size={12} strokeWidth={2.5} />
                  {lastActive}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement leave project functionality
                  }}
                  className="text-muted-foreground hover:text-destructive transition-colors" 
                  title="Leave"
                >
                  <X size={16} strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="sketchy-border bg-card p-12 text-center">
          <p className="text-xl font-sketch text-muted-foreground mb-2">
            No shared projects yet
          </p>
          <p className="text-sm font-sketch text-muted-foreground/60">
            Projects shared with you through organizations will appear here
          </p>
        </div>
      )}
    </div>
  );
}
