"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "./ui/button";

export const ThemeToggle = () => {
  const { setTheme, theme, resolvedTheme } = useTheme();

  const effectiveTheme = (theme === "system" ? resolvedTheme : theme) ?? "light";
  const nextTheme = effectiveTheme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(nextTheme)}
    >
      <div className="relative flex h-4 w-4 items-center justify-center">
        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};
