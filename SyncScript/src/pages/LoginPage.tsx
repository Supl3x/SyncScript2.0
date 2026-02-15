import { useState, useEffect } from "react";
import { Pencil, Star, ArrowRight, Sparkles } from "lucide-react";
import SketchyButton from "@/components/SketchyButton";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && !isLoading) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, isLoading, navigate, from]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        // Check if error is about email verification
        if (error.message?.includes('verify') || error.message?.includes('email')) {
          toast.error("Email verification required", {
            description: "Please verify your email before signing in. Check your inbox for the verification link.",
          });
        } else {
          toast.error("Login failed", {
            description: error.message || "Invalid email or password",
          });
        }
        setIsLoading(false);
        return;
      }

      // Wait for session to be established (polling with timeout)
      let attempts = 0;
      const maxAttempts = 10; // 5 seconds max
      
      while (attempts < maxAttempts) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Session is ready! Wait a tiny bit for auth context to update
          await new Promise(resolve => setTimeout(resolve, 200));
          setIsLoading(false);
          toast.success("Welcome back!");
          navigate(from, { replace: true });
          return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      // If we get here, session wasn't established in time
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setIsLoading(false);
        toast.success("Welcome back!");
        navigate(from, { replace: true });
      } else {
        setIsLoading(false);
        toast.error("Login failed", {
          description: "Session not established. Please try again.",
        });
      }
    } catch (error: any) {
      toast.error("Login failed", {
        description: error.message || "An unexpected error occurred",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="graph-paper min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Doodle decorations */}
      <Star
        size={32}
        strokeWidth={2.5}
        className="absolute top-20 left-[15%] text-marker-yellow animate-wobble"
      />
      <Sparkles
        size={28}
        strokeWidth={2.5}
        className="absolute top-32 right-[20%] text-marker-blue animate-float"
      />
      <ArrowRight
        size={36}
        strokeWidth={2.5}
        className="absolute bottom-32 left-[25%] text-marker-red rotate-[-30deg] animate-float"
        style={{ animationDelay: "1s" }}
      />
      <Star
        size={24}
        strokeWidth={2.5}
        className="absolute bottom-40 right-[15%] text-marker-green animate-wobble"
        style={{ animationDelay: "0.5s" }}
      />

      <div className="sketchy-border bg-card p-8 sm:p-12 w-full max-w-md animate-sketch-in">
        {/* Header */}
        <div className="text-center mb-8">
          <Pencil
            size={48}
            strokeWidth={2.5}
            className="mx-auto text-foreground animate-pencil-bounce mb-4"
          />
          <h1 className="text-4xl font-sketch text-foreground mb-2">SyncScript</h1>
          <p className="text-lg font-sketch text-muted-foreground">
            Start Researching Together
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-sm font-sketch text-muted-foreground mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-underline w-full text-lg"
              placeholder="researcher@university.edu"
            />
          </div>
          <div>
            <label className="text-sm font-sketch text-muted-foreground mb-1 block">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-underline w-full text-lg"
              placeholder="••••••••"
            />
          </div>

          <SketchyButton 
            variant="primary" 
            className="w-full" 
            type="submit"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? "Signing in..." : "Enter Vault →"}
          </SketchyButton>
        </form>

        {/* Divider removed */}

        <div className="mt-8 space-y-4">
          <SketchyButton
            variant="default"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => navigate("/register")}
            type="button"
          >
            Register
          </SketchyButton>
        </div>

        <p className="text-center text-sm font-sketch text-muted-foreground mt-6">
          Don't have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-primary underline hover:text-marker-blue"
          >
            Sign up here
          </button>
        </p>
      </div>
    </div>
  );
}
