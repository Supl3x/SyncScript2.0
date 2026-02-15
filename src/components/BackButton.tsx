import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  to?: string;
  label?: string;
}

export default function BackButton({ to = "/dashboard", label = "Back" }: BackButtonProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-2 font-sketch text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft size={20} strokeWidth={2.5} />
      {label}
    </button>
  );
}
