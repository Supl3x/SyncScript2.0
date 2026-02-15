import { useState } from "react";
import { Palette } from "lucide-react";
import SketchyButton from "@/components/SketchyButton";
import BackButton from "@/components/BackButton";
import { useNavigate } from "react-router-dom";
import { useCreateProject, useGenerateSlug } from "@/hooks/useSupabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const colorOptions = [
  { name: "Blue", value: "bg-marker-blue/10", border: "border-marker-blue" },
  { name: "Green", value: "bg-marker-green/10", border: "border-marker-green" },
  { name: "Red", value: "bg-marker-red/10", border: "border-marker-red" },
  { name: "Yellow", value: "bg-marker-yellow/10", border: "border-marker-yellow" },
];

export default function NewVaultPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { mutate: createProject, isPending } = useCreateProject();
  const { mutateAsync: generateSlug } = useGenerateSlug();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authLoading) {
      toast.error("Please wait while we verify your session...");
      return;
    }
    
    if (!user) {
      toast.error("You must be logged in");
      navigate("/login");
      return;
    }

    try {
      // Use database function to generate unique slug
      const slug = await generateSlug(title);
      
      createProject({
        name: title,
        slug: slug,
        description: description || null,
        owner_id: user.id,
        color: colorOptions[selectedColor].name.toLowerCase(),
        visibility: 'private',
        status: 'pending',
        priority: 'medium',
      }, {
        onSuccess: (data) => {
          toast.success("Vault created successfully!");
          navigate(`/dashboard/vault/${data.id}`);
        },
        onError: (error: any) => {
          toast.error("Failed to create vault", {
            description: error.message,
          });
        },
      });
    } catch (error: any) {
      toast.error("Failed to generate slug", {
        description: error.message,
      });
    }
  };

  return (
    <div className="animate-sketch-in max-w-2xl mx-auto">
      <BackButton label="Back to Vaults" />

      <div className="sketchy-border bg-card p-8">
        <h1 className="text-3xl font-sketch text-foreground mb-2">Create New Vault 📁</h1>
        <p className="font-sketch text-muted-foreground mb-8">
          Set up a new knowledge repository for your research.
        </p>

        <form onSubmit={handleCreate} className="space-y-6">
          {/* Title */}
          <div>
            <label className="text-sm font-sketch text-muted-foreground mb-1 block">
              Vault Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-underline w-full text-xl"
              placeholder="e.g., Quantum Physics Lab"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-sketch text-muted-foreground mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-underline w-full text-base resize-none"
              rows={3}
              placeholder="What is this vault about?"
            />
          </div>

          {/* Color */}
          <div>
            <label className="text-sm font-sketch text-muted-foreground mb-3 flex items-center gap-2">
              <Palette size={16} strokeWidth={2.5} />
              Vault Color
            </label>
            <div className="flex gap-3">
              {colorOptions.map((color, i) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setSelectedColor(i)}
                  className={`w-12 h-12 rounded-full border-2 ${color.value} ${color.border} transition-all ${
                    selectedColor === i
                      ? "scale-110 shadow-sketch-sm"
                      : "opacity-60 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-dashed border-ink/20" />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <SketchyButton 
              variant="ghost" 
              type="button" 
              onClick={() => navigate("/dashboard")}
              disabled={isPending}
            >
              Cancel
            </SketchyButton>
            <SketchyButton 
              variant="primary" 
              type="submit"
              disabled={isPending || !title}
            >
              {isPending ? "Creating..." : "Create Vault →"}
            </SketchyButton>
          </div>
        </form>
      </div>
    </div>
  );
}
