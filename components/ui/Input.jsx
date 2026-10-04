import { cn } from "@/lib/utils";

export default function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}