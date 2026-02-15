import { useState } from "react";
import { Plus, Users, Clock, MoreHorizontal, Star, Trash2 } from "lucide-react";
import SketchyButton from "@/components/SketchyButton";
import SketchyCard from "@/components/SketchyCard";
import { useNavigate } from "react-router-dom";
import { useProjects, useDeleteProject } from "@/hooks/useSupabase";
import { useToggleFavorite } from "@/hooks/useSupabaseExtended";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

const colorClasses = [
  "bg-marker-blue/10",
  "bg-marker-green/10",
  "bg-marker-red/10",
  "bg-marker-yellow/10",
];

export default function MyVaults() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const { data: projects, isLoading } = useProjects();
  const { mutate: deleteProject } = useDeleteProject();
  const { mutate: toggleFavorite } = useToggleFavorite();

  const filtered = projects?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleToggleFavorite = (id: string, isFavorite: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({ projectId: id, isFavorite: !isFavorite }, {
      onSuccess: () => {
        toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
      },
      onError: () => {
        toast.error("Failed to update favorite");
      },
    });
    setOpenMenuId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this vault?")) {
      deleteProject(id, {
        onSuccess: () => {
          toast.success("Vault deleted successfully");
        },
        onError: () => {
          toast.error("Failed to delete vault");
        },
      });
    }
    setOpenMenuId(null);
  };

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="animate-sketch-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-sketch-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-sketch text-foreground truncate">My Vaults 📂</h1>
          <p className="text-muted-foreground font-sketch text-sm sm:text-base">
            Your personal knowledge repositories
          </p>
        </div>
        <SketchyButton variant="primary" className="flex items-center gap-2" onClick={() => navigate("/dashboard/new-vault")}>
          <Plus size={20} strokeWidth={2.5} />
          New Vault
        </SketchyButton>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vaults..."
          className="input-underline w-full sm:max-w-sm text-base sm:text-lg"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full sketchy-border bg-card p-12 text-center">
            <p className="text-xl font-sketch text-muted-foreground mb-2">
              {search ? "No vaults found" : "No vaults yet"}
            </p>
            <p className="text-sm font-sketch text-muted-foreground/60 mb-4">
              {search ? "Try a different search term" : "Create your first vault to get started"}
            </p>
            {!search && (
              <SketchyButton
                variant="primary"
                onClick={() => navigate("/dashboard/new-vault")}
              >
                <Plus size={20} strokeWidth={2.5} className="mr-2" />
                Create Vault
              </SketchyButton>
            )}
          </div>
        ) : (
          filtered.map((vault, i) => {
            const isFavorite = vault.tags?.includes('favorite') || false;
            const colorClass = colorClasses[i % colorClasses.length];

            return (
              <div key={vault.id} className="relative">
                <SketchyCard
                  variant={i % 2 === 0 ? "default" : "alt"}
                  className={`cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-sketch-hover transition-all group ${
                    isFavorite ? "ring-2 ring-marker-yellow" : ""
                  }`}
                  onClick={() => navigate(`/dashboard/vault/${vault.id}`)}
                >
                  {/* Color strip */}
                  <div className={`h-3 -mx-4 -mt-4 mb-4 ${colorClass} rounded-t-lg`} />

                  {/* Three dots menu */}
                  <button
                    onClick={(e) => toggleMenu(vault.id, e)}
                    className="absolute top-6 right-4 p-1 hover:bg-paper-dark rounded-full transition-colors z-10"
                  >
                    <MoreHorizontal size={18} strokeWidth={2.5} className="text-muted-foreground" />
                  </button>

                  {/* Dropdown menu */}
                  {openMenuId === vault.id && (
                    <div className="absolute top-12 right-4 sketchy-border-sm bg-card shadow-sketch z-20 min-w-[140px]">
                      <button
                        onClick={(e) => handleToggleFavorite(vault.id, isFavorite, e)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-sketch text-foreground hover:bg-paper-dark transition-colors"
                      >
                        <Star 
                          size={14} 
                          strokeWidth={2.5} 
                          className={isFavorite ? "fill-marker-yellow text-marker-yellow" : "text-muted-foreground"}
                        />
                        {isFavorite ? "Unfavorite" : "Favorite"}
                      </button>
                      <button
                        onClick={(e) => handleDelete(vault.id, e)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-sketch text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                        Delete
                      </button>
                    </div>
                  )}

                  {/* Favorite star indicator */}
                  {isFavorite && (
                    <Star 
                      size={16} 
                      className="absolute top-6 left-4 fill-marker-yellow text-marker-yellow"
                      strokeWidth={2.5}
                    />
                  )}

                  <h3 className="text-xl font-sketch text-foreground mb-1 group-hover:text-primary transition-colors">
                    {vault.name}
                  </h3>
                  <p className="text-sm font-sketch text-muted-foreground mb-4 line-clamp-2">
                    {vault.description || "No description"}
                  </p>

                  <div className="flex items-center justify-between">
                    {/* Status indicator */}
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        vault.status === 'in_progress' ? 'bg-marker-blue' :
                        vault.status === 'completed' ? 'bg-marker-green' :
                        'bg-muted-foreground/30'
                      }`} />
                      <span className="text-xs font-sketch text-muted-foreground capitalize">
                        {vault.status?.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1 text-xs font-sketch text-muted-foreground">
                      <Clock size={12} strokeWidth={2.5} />
                      {formatDistanceToNow(new Date(vault.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                </SketchyCard>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
