import { Check } from "lucide-react";

import { INTEREST_OPTIONS, MIN_INTERESTS } from "@/lib/auth/validation";
import { cn } from "@/lib/utils";

/**
 * Multi-select chips built on real checkboxes (visually hidden, styled via `peer`), so
 * keyboard (Tab / Space), screen readers and form semantics work with no extra ARIA.
 */
export default function InterestPicker({ value, onChange, error }) {
  const toggle = (interest) => onChange(value.includes(interest) ? value.filter((i) => i !== interest) : [...value, interest]);

  return (
    <fieldset aria-describedby="interests-message" className="space-y-2.5">
      <legend className="text-sm font-medium text-foreground">
        Your interests <span className="font-normal text-muted-foreground">(select at least {MIN_INTERESTS})</span>
      </legend>

      <div className="flex flex-wrap gap-2">
        {INTEREST_OPTIONS.map((interest, index) => {
          const checked = value.includes(interest);
          return (
            <label key={interest} className="cursor-pointer">
              <input
                id={index === 0 ? "signup-interests" : undefined}
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                onChange={() => toggle(interest)}
              />
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50",
                  checked ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {checked && <Check className="h-3 w-3" aria-hidden="true" />}
                {interest}
              </span>
            </label>
          );
        })}
      </div>

      <p id="interests-message" role={error ? "alert" : "status"} aria-live="polite" className={cn("text-xs", error ? "text-danger" : "text-muted-foreground")}>
        {error || `${value.length} selected`}
      </p>
    </fieldset>
  );
}
