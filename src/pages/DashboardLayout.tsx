import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import AppSidebar from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardLayout() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Refresh data when navigating between pages
  useEffect(() => {
    if (user) {
      // Invalidate relevant queries when route changes
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // If on settings page, refresh user profile
      if (location.pathname === '/dashboard/settings') {
        queryClient.invalidateQueries({ queryKey: ['users'] });
      }
    }
  }, [location.pathname, user, queryClient]);

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row graph-paper">
      <AppSidebar />
      <main className="flex-1 min-w-0 p-4 sm:p-6 pt-20 sm:pt-6 overflow-y-auto">
        <Outlet />
      </main>
      <ThemeToggle />
    </div>
  );
}
