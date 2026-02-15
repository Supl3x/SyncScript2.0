import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./pages/DashboardLayout";
import MyVaults from "./pages/MyVaults";
import Favorites from "./pages/Favorites";
import NewVaultPage from "./pages/NewVaultPage";
import VaultWorkspace from "./pages/VaultWorkspace";
import SharedResearch from "./pages/SharedResearch";
import WhiteboardPage from "./pages/WhiteboardPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

import RegisterPage from "./pages/RegisterPage";
// import LoadingScreen from "./components/LoadingScreen"; // Temporarily disabled for debugging

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnMount: true, // Refetch when component mounts
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnReconnect: true, // Refetch when network reconnects
      staleTime: 1000 * 60 * 5, // Consider data stale after 5 minutes
      gcTime: 1000 * 60 * 10, // Keep unused data in cache for 10 minutes
    },
  },
});

const App = () => {
  console.log("✅ SyncScript App is loading...");
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {/* <LoadingScreen /> */}
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<MyVaults />} />
                <Route path="favorites" element={<Favorites />} />
                <Route path="new-vault" element={<NewVaultPage />} />
                <Route path="shared" element={<SharedResearch />} />
                <Route path="whiteboard" element={<WhiteboardPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="vault/:id" element={<VaultWorkspace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
