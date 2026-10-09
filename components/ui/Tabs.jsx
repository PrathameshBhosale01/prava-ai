"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

export const tabId = (prefix, id) => `${prefix}-tab-${id}`;
export const panelId = (prefix, id) => `${prefix}-panel-${id}`;

/**
 * Accessible tab list (WAI-ARIA "tabs" pattern): one tab stop, arrow keys /
 * Home / End move between tabs, and each tab points at its panel.
 *
 * Controlled: pass `value` and `onChange`. Render the panels yourself and give
 * each one `role="tabpanel"`, `id={panelId(idPrefix, id)}` and
 * `aria-labelledby={tabId(idPrefix, id)}`.
 *
 * tabs: [{ id, label, shortLabel?, icon? }]
 */
export default function Tabs({
  tabs,
  value,
  onChange,
  label,
  idPrefix = "tabs",
  className,
}) {
  const refs = useRef({});

  function handleKeyDown(event, index) {
    const last = tabs.length - 1;
    let next = null;

    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;

    if (next === null) return;

    event.preventDefault();
    const target = tabs[next];
    onChange(target.id);
    refs.current[target.id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex w-full gap-1 rounded-xl border border-border bg-surface-muted p-1 sm:inline-flex sm:w-auto",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const selected = tab.id === value;

        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.id)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium transition-colors sm:flex-none sm:gap-2 sm:px-4",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              selected
                ? "bg-surface text-foreground shadow-card"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon && (
              <Icon
                className={cn("h-4 w-4 shrink-0", selected && "text-primary")}
                aria-hidden="true"
              />
            )}
            <span className="sm:hidden">{tab.shortLabel ?? tab.label}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
