import { ArrowUpDown } from "lucide-react";

import { SORT_OPTIONS } from "@/lib/zone/constants";

export default function SortSelect({ value, onChange }) {
  return (
    <div className="relative inline-flex items-center">
      <label htmlFor="zone-sort" className="sr-only">
        Sort stories by
      </label>
      <ArrowUpDown className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      <select
        id="zone-sort"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 cursor-pointer rounded-lg border border-border bg-surface pl-8 pr-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
