import { CATEGORIES } from "@/lib/zone/constants";
import { cn } from "@/lib/utils";

const chip =
  "shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors";

/** Horizontally scrollable on phones, so it never wraps into a wall of chips. */
export default function CategoryFilter({ value, onChange }) {
  return (
    <div role="group" aria-label="Filter by category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {["", ...CATEGORIES].map((category) => {
        const active = value === category;
        return (
          <button
            key={category || "all"}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(category)}
            className={cn(
              chip,
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {category || "All"}
          </button>
        );
      })}
    </div>
  );
}
