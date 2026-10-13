"use client";

import { useId, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

import { usePlaceSearch } from "@/hooks/usePlaceSearch";
import { cn } from "@/lib/utils";

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * A text box that suggests real places as you type (WAI-ARIA combobox).
 *  - onChange(text) fires on every keystroke, so typing any place still works
 *    (suggestions are help, never a requirement: if the lookup fails you just keep typing).
 *  - onSelect(place) fires when a suggestion is chosen, with the country and coordinates.
 * Keys: ↓/↑ move, Enter picks, Esc closes. Enter only submits the form when no list is open.
 */
export default function PlaceInput({ id, label, hideLabel = false, value, onChange, onSelect, placeholder, describedBy, invalid = false }) {
  const autoId = useId();
  const baseId = id ?? autoId;
  const listId = `${baseId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const { status, places } = usePlaceSearch(value, { enabled: open });
  const showList = open && status !== "idle";
  const hasOptions = showList && places.length > 0;

  function choose(place) {
    onSelect?.(place);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!hasOptions) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i === -1 ? (step > 0 ? 0 : places.length - 1) : (i + step + places.length) % places.length));
    } else if (e.key === "Enter") {
      if (hasOptions && active >= 0) {
        e.preventDefault();
        choose(places[active]);
      } else if (showList) {
        setOpen(false); // close the list instead of submitting the whole form
        e.preventDefault();
      }
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  const statusText =
    status === "loading" ? "Searching places…" : status === "empty" ? "No matches. We'll use what you typed." : status === "error" ? "Couldn't search places right now. You can still type any place." : "";

  return (
    <div className="relative">
      <label htmlFor={baseId} className={cn("mb-2 block text-sm font-medium", hideLabel && "sr-only")}>
        {label}
      </label>
      <input
        id={baseId}
        type="text"
        role="combobox"
        aria-expanded={hasOptions}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={hasOptions && active >= 0 ? `${baseId}-opt-${active}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        className={cn(inputClass, invalid && "border-danger")}
      />

      {/* Options use onMouseDown + preventDefault so the input keeps focus (and its blur doesn't close the list first). */}
      {showList && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-pop">
          {hasOptions && (
          <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="max-h-64 overflow-y-auto py-1">
            {places.map((p, i) => (
              <li
                key={p.id}
                id={`${baseId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(p);
                }}
                onMouseEnter={() => setActive(i)}
                className={cn("flex cursor-pointer items-start gap-2.5 px-3 py-2.5 text-sm", i === active ? "bg-primary-soft" : "hover:bg-surface-muted")}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{p.name}</span>
                  {p.detail && <span className="block truncate text-xs text-muted-foreground">{p.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
          )}
          {statusText && (
            <p className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
              {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              {statusText}
            </p>
          )}
        </div>
      )}

      <p role="status" className="sr-only">
        {hasOptions ? `${places.length} suggestions available. Use the up and down arrow keys to choose.` : showList ? statusText : ""}
      </p>
    </div>
  );
}
