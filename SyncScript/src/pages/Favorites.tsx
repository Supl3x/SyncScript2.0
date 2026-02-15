import { useState } from "react";
import { Plus, Users, Clock, MoreHorizontal, Star, Trash2 } from "lucide-react";
import SketchyCard from "@/components/SketchyCard";
import BackButton from "@/components/BackButton";
import { useNavigate } from "react-router-dom";
import { useFavoriteProjects } from "@/hooks/useSupabaseExtended";
import { useDeleteProject } from "@/hooks/useSupabase";
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

export default function Favorites() {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  const { data: favoriteProjects, isLoading, error } = useFavoriteProjects();
  const { mutate: deleteProject } = useDeleteProject();
  const { mutate: toggleFavorite } = useToggleFavorite();

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite({ projectId: id, isFavorite: false }, {
      onSuccess: () => {
        toast.success("Removed from favorites");
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
        <BackButton label="Back to Dashboard" />
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-sketch-in">
        <BackButton label="Back to Dashboard" />
        <div className="mb-8">
          <h1 className="text-3xl font-sketch text-foreground">Favorites ⭐</h1>
          <p className="text-muted-foreground font-sketch">
            Your starred vaults for quick access
          </p>
        </div>
        <div className="sketchy-border bg-card p-12 text-center">
          <p className="text-xl font-sketch text-destructive mb-2">
            Error loading favorites
          </p>
          <p className="text-sm font-sketch text-muted-foreground/60">
            {(error as any)?.message || "Please try refreshing the page"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-sketch-in">
      <BackButton label="Back to Dashboard" />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-sketch text-foreground">Favorites ⭐</h1>
        <p className="text-muted-foreground font-sketch">
          Your starred vaults for quick access
        </p>
      </div>

      {!favoriteProjects || favoriteProjects.length === 0 ? (
        <div className="sketchy-border bg-card p-12 text-center">
          <Star size={48} className="mx-auto text-muted-foreground/40 mb-4" strokeWidth={1.5} />
          <p className="text-xl font-sketch text-muted-foreground mb-2">
            No favorites yet
          </p>
          <p className="text-sm font-sketch text-muted-foreground/60">
            Click the three dots on any vault and select "Favorite" to add it here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteProjects.map((vault, i) => {
            const colorClass = colorClasses[i % colorClasses.length];
            
            return (
              <div key={vault.id} className="relative">
                <SketchyCard
                  variant={i % 2 === 0 ? "default" : "alt"}
                  className="cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-sketch-hover transition-all group ring-2 ring-marker-yellow"
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
                        onClick={(e) => handleToggleFavorite(vault.id, e)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-sketch text-foreground hover:bg-paper-dark transition-colors"
                      >
                        <Star 
                          size={14} 
                          strokeWidth={2.5} 
                          className="fill-marker-yellow text-marker-yellow"
                        />
                        Unfavorite
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
                <Star 
                  size={16} 
                  className="absolute top-6 left-4 fill-marker-yellow text-marker-yellow"
                  strokeWidth={2.5}
                />

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
          })}
        </div>
      )}
    </div>
  );
}
