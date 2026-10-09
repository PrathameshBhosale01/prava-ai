"use client";

import { Search, X } from "lucide-react";

import Input from "@/components/ui/Input";
import { SORT_OPTIONS, STATUS_LABELS } from "@/lib/tripInbox";
import { cn } from "@/lib/utils";

const STATUS_ORDER = ["all", "upcoming", "ongoing", "completed", "unscheduled"];

const selectClass =
  "h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

export default function TripsToolbar({
  query,
  onQueryChange,
  status,
  onStatusChange,
  counts,
  category,
  onCategoryChange,
  categories,
  sort,
  onSortChange,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by title, destination or interest…"
            aria-label="Search trips"
            className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {categories.length > 0 && (
            <select
              aria-label="Filter by trip type"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className={cn(selectClass, "flex-1 sm:flex-none")}
            >
              <option value="all">All types</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Sort trips"
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className={cn(selectClass, "flex-1 sm:flex-none")}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {STATUS_ORDER.filter((s) => s === "all" || counts[s] > 0).map((s) => {
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => onStatusChange(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "all" ? "All" : STATUS_LABELS[s]}
              <span className="ml-1.5 text-xs opacity-70">{counts[s]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
