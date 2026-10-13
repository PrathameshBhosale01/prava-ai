"use client";

import { Minus, Plus } from "lucide-react";

const button =
  "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40";

/** − 3 nights + : big tap targets, announces the new value, never goes outside min/max. */
export default function Stepper({ value, onChange, min = 0, max = 99, unit, label, canIncrease = true }) {
  const plural = value === 1 ? unit : `${unit}s`;
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={`Fewer ${unit}s: ${label}`} className={button}>
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-[5.5rem] text-center text-sm font-medium text-foreground" aria-live="polite">
        {value} {plural}
      </span>
      <button type="button" onClick={() => onChange(value + 1)} disabled={value >= max || !canIncrease} aria-label={`More ${unit}s: ${label}`} className={button}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
