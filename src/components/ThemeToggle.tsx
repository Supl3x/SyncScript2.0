import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import SketchyButton from "./SketchyButton";

export function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark">(() => {
        // Initialize from localStorage or system preference
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('theme');
            if (stored === 'dark' || stored === 'light') {
                return stored;
            }
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = document.documentElement;
        
        // Remove both classes first
        root.classList.remove('light', 'dark');
        
        // Add the current theme
        root.classList.add(theme);
        
        // Save to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
    };

    return (
        <SketchyButton
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="fixed bottom-4 right-4 z-[9999] rounded-full w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center bg-card hover:bg-card shadow-sketch touch-manipulation"
            aria-label="Toggle theme"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === "light" ? (
                <Sun className="h-6 w-6 text-marker-yellow" />
            ) : (
                <Moon className="h-6 w-6 text-marker-blue" />
            )}
        </SketchyButton>
    );
}
