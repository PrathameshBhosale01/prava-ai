"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import Tabs, { panelId, tabId } from "@/components/ui/Tabs";
import { DEFAULT_TOOL, TOOLS } from "./toolsConfig";

const PREFIX = "tools";

export default function ToolsWorkspace() {
  const pathname = usePathname();
  const params = useSearchParams();

  // The URL is the source of truth, so tabs are linkable and Back/Forward work.
  const requested = params.get("tab");
  const active = TOOLS.some((tool) => tool.id === requested) ? requested : DEFAULT_TOOL;

  // Mount a tool the first time it is opened, then keep it mounted (hidden) so
  // switching back keeps its state and doesn't refetch.
  const [visited, setVisited] = useState(() => new Set([active]));
  if (!visited.has(active)) setVisited(new Set(visited).add(active));

  function select(id) {
    // Native history API: Next.js syncs useSearchParams, and it's instant.
    window.history.replaceState(null, "", `${pathname}?tab=${id}`);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Travel Tools
        </h1>
        <p className="text-sm text-muted-foreground">
          Essentials to make your trips easier and safer.
        </p>
      </header>

      {TOOLS.length > 1 && (
        <Tabs
          tabs={TOOLS}
          value={active}
          onChange={select}
          label="Travel tools"
          idPrefix={PREFIX}
        />
      )}

      {TOOLS.map((tool) =>
        visited.has(tool.id) ? (
          <div
            key={tool.id}
            role={TOOLS.length > 1 ? "tabpanel" : undefined}
            id={panelId(PREFIX, tool.id)}
            aria-labelledby={TOOLS.length > 1 ? tabId(PREFIX, tool.id) : undefined}
            hidden={tool.id !== active}
            className="motion-safe:animate-[tool-in_180ms_ease-out]"
          >
            <tool.Component {...(tool.getProps?.(params) ?? {})} />
          </div>
        ) : null
      )}
    </div>
  );
}
