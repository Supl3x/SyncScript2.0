import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SketchyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "danger" | "dashed" | "ghost";
  size?: "sm" | "md" | "lg";
}

const SketchyButton = forwardRef<HTMLButtonElement, SketchyButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const base =
      "font-sketch cursor-pointer transition-all duration-200 active:translate-x-[2px] active:translate-y-[2px] active:shadow-sketch-sm disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      default:
        "bg-card text-foreground border-2 border-ink shadow-sketch hover:shadow-sketch-hover hover:translate-x-[2px] hover:translate-y-[2px]",
      primary:
        "bg-primary text-primary-foreground border-2 border-ink shadow-sketch hover:shadow-sketch-hover hover:translate-x-[2px] hover:translate-y-[2px]",
      danger:
        "bg-destructive text-destructive-foreground border-2 border-ink shadow-sketch hover:shadow-sketch-hover hover:translate-x-[2px] hover:translate-y-[2px]",
      dashed:
        "bg-transparent text-foreground border-2 border-dashed border-ink hover:bg-paper-dark hover:shadow-sketch-sm",
      ghost:
        "bg-transparent text-foreground border-none shadow-none hover:bg-paper-dark",
    };

    const sizes = {
      sm: "px-3 py-1 text-sm",
      md: "px-5 py-2 text-base",
      lg: "px-8 py-3 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(
          base,
          variants[variant],
          sizes[size],
          "rounded-[255px_15px_225px_15px/15px_225px_15px_255px]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

SketchyButton.displayName = "SketchyButton";
export default SketchyButton;
