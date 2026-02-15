import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SketchyCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "alt" | "sticky";
}

const SketchyCard = forwardRef<HTMLDivElement, SketchyCardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "sketchy-border bg-card",
      alt: "sketchy-border-alt bg-card",
      sticky: "sketchy-border bg-marker-yellow/20 rotate-[-1deg] hover:rotate-0 transition-transform",
    };

    return (
      <div
        ref={ref}
        className={cn(variants[variant], "p-4 animate-sketch-in", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SketchyCard.displayName = "SketchyCard";
export default SketchyCard;
