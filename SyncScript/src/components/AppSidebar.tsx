import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FolderOpen,
  Share2,
  PenTool,
  Settings,
  Pencil,
  LogOut,
  Star,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { label: "My Vaults", icon: FolderOpen, path: "/dashboard" },
  { label: "Favorites", icon: Star, path: "/dashboard/favorites" },
  { label: "Shared Research", icon: Share2, path: "/dashboard/shared" },
  { label: "Whiteboard", icon: PenTool, path: "/dashboard/whiteboard" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

const SidebarContent = ({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user, signOut } = useAuth();

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Get user display info
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user?.email || '';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || displayEmail[0]?.toUpperCase() || 'U';

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Logo */}
      <button
        onClick={() => handleNav("/dashboard")}
        className="flex items-center gap-2 mb-8 px-2"
      >
        <Pencil size={28} strokeWidth={2.5} className="text-foreground" />
        <h1 className="text-2xl font-sketch text-foreground">SyncScript</h1>
      </button>

      {/* Nav items */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-lg font-sketch rounded-[155px_10px_145px_10px/10px_145px_10px_155px] transition-all duration-200",
                active
                  ? "bg-card border-2 border-ink shadow-sketch-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-paper-dark border-2 border-transparent"
              )}
            >
              <item.icon size={20} strokeWidth={2.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t-2 border-dashed border-ink/30 pt-4 mt-4">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-9 h-9 rounded-full border-2 border-ink bg-marker-blue/20 flex items-center justify-center">
            <span className="text-sm font-sketch text-foreground">{initials}</span>
          </div>
          <div>
            <p className="text-sm font-sketch text-foreground leading-tight">{displayName}</p>
            <p className="text-xs font-sketch text-muted-foreground">{displayEmail}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-sketch text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut size={16} strokeWidth={2.5} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default function AppSidebar() {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <>
        <header className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 h-14 px-4 bg-background/95 backdrop-blur border-b-2 border-ink shadow-sketch-sm">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="p-2 -ml-2 rounded-lg hover:bg-paper-dark transition-colors"
              >
                <Menu size={24} strokeWidth={2.5} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 max-w-[85vw] p-4 bg-sidebar border-2 border-ink"
            >
              <SidebarContent onNavigate={() => setOpen(false)} className="p-0" />
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-sketch text-foreground">SyncScript</h1>
        </header>
      </>
    );
  }

  return (
    <aside className="hidden md:flex w-64 min-h-screen bg-sidebar notebook-edge flex-col p-4 shrink-0">
      <SidebarContent />
    </aside>
  );
}
