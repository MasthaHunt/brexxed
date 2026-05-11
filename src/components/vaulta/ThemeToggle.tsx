import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useAppState } from "@/state/AppState";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { state, toggleTheme } = useAppState();
  const isDark = state.theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn(
        "relative inline-flex h-9 w-16 items-center rounded-full border border-border bg-muted/60 p-1 transition-colors hover:bg-muted",
        className,
      )}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-md",
          isDark ? "ml-auto" : "",
        )}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-primary" />
        ) : (
          <Sun className="h-4 w-4 text-primary" />
        )}
      </motion.div>
    </button>
  );
};
