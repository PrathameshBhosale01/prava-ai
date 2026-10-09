import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Styled native <select> (keeps mobile pickers and keyboard behaviour).
 * `className` styles the wrapper (width, margin); `selectClassName` the control.
 */
export default function Select({ className, selectClassName, children, ...props }) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "h-10 w-full cursor-pointer appearance-none rounded-lg border border-border bg-surface pl-3 pr-9 text-sm text-foreground",
          "transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:cursor-not-allowed disabled:opacity-60",
          selectClassName
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </div>
  );
}
