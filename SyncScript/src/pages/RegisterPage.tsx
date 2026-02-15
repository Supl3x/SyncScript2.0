import { useState } from "react";
import {
    Pencil,
    Star,
    ArrowRight,
    Sparkles,
    User,
    Lock,
    Mail,
} from "lucide-react";
import SketchyButton from "@/components/SketchyButton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function RegisterPage() {
    const navigate = useNavigate();
    const { signUp } = useAuth();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);

        const { error } = await signUp(email, password, {
            full_name: fullName,
            username: email.split('@')[0], // Generate username from email
        });

        if (error) {
            toast.error("Registration failed", {
                description: error.message,
            });
            setIsLoading(false);
        } else {
            toast.success("Account created!", {
                description: "Welcome to SyncScript!",
            });
            navigate("/dashboard");
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
                    <h1 className="text-4xl font-sketch text-foreground mb-2">
                        Join SyncScript
                    </h1>
                    <p className="text-lg font-sketch text-muted-foreground">
                        Start Your Research Journey
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleRegister} className="space-y-6">
                    <div>
                        <label className="text-sm font-sketch text-muted-foreground mb-1 block">
                            Full Name
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="input-underline w-full text-lg pl-8"
                                placeholder="John Doe"
                            />
                            <User
                                size={18}
                                className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-sketch text-muted-foreground mb-1 block">
                            Email
                        </label>
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-underline w-full text-lg pl-8"
                                placeholder="researcher@university.edu"
                            />
                            <Mail
                                size={18}
                                className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-sketch text-muted-foreground mb-1 block">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-underline w-full text-lg pl-8"
                                placeholder="••••••••"
                            />
                            <Lock
                                size={18}
                                className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-sketch text-muted-foreground mb-1 block">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-underline w-full text-lg pl-8"
                                placeholder="••••••••"
                            />
                            <Lock
                                size={18}
                                className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground"
                            />
                        </div>
                    </div>

                    <SketchyButton 
                        variant="primary" 
                        className="w-full" 
                        type="submit"
                        disabled={isLoading || !fullName || !email || !password || !confirmPassword}
                    >
                        {isLoading ? "Creating account..." : "Create Account →"}
                    </SketchyButton>
                </form>

                <p className="text-center text-sm font-sketch text-muted-foreground mt-6">
                    Already have an account?{" "}
                    <button
                        onClick={() => navigate("/login")}
                        className="text-primary underline hover:text-marker-blue"
                    >
                        Sign in here
                    </button>
                </p>
            </div>
        </div>
    );
}
