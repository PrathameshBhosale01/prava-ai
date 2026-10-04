"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import Button from "@/components/ui/Button";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* Both icons are in the DOM; CSS picks one. No mounted-state flicker. */}
      <Moon className="h-[18px] w-[18px] dark:hidden" />
      <Sun className="hidden h-[18px] w-[18px] dark:block" />
    </Button>
  );
}