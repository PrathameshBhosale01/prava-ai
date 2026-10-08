import { Search, X } from "lucide-react";

import Input from "@/components/ui/Input";

export default function SearchField({ value, onChange, onClear }) {
  return (
    <div role="search" className="relative">
      <label htmlFor="zone-search" className="sr-only">
        Search stories
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        id="zone-search"
        type="search"
        value={value}
        maxLength={100}
        autoComplete="off"
        placeholder="Search by title, place, category or author…"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && value && onClear()}
        // `appearance-none` hides the browser's own clear (×) so ours is the only one.
        className="h-11 appearance-none pl-9 pr-10 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
