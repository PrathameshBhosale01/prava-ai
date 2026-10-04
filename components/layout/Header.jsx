"use client";

import { Menu, PanelLeft } from "lucide-react";

import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Header({ onToggleMobile, onToggleDesktop }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6">
      {/* Mobile: open drawer */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        className="md:hidden"
        onClick={onToggleMobile}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Desktop: collapse / expand sidebar */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Toggle sidebar"
        className="hidden md:inline-flex"
        onClick={onToggleDesktop}
      >
        <PanelLeft className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {/* Header widgets (weather chip lands here in Step 4) */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}