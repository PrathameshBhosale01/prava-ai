import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

const variants = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover",
  secondary:
    "bg-surface-muted text-foreground hover:bg-border",
  outline:
    "border border-border bg-surface text-foreground hover:bg-surface-muted",
  ghost: "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
  danger: "bg-danger text-white hover:opacity-90",
  // For use on top of the gradient hero banner
  inverse: "bg-white text-indigo-700 shadow-sm hover:bg-indigo-50",
};

const sizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  icon: "h-9 w-9",
};

/**
 * Returns the class string for a button. Use it directly on <Link> so a
 * link can look like a button without nesting <button> inside <a>:
 *   <Link href="/trips" className={buttonVariants({ variant: "outline" })}>
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export default function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}