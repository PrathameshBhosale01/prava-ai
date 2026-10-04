import { cn } from "@/lib/utils";

/** Pulsing placeholder block. Size it with className (h-4 w-32, etc). */
export default function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
      {...props}
    />
  );
}