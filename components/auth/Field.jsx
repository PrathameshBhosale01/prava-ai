import { cn } from "@/lib/utils";

/**
 * Label + input + message, wired for assistive tech: the label is bound with htmlFor,
 * and the error/hint are linked via aria-describedby so a screen reader reads them
 * together with the field. Extra props (type, value, autoComplete, …) go to the <input>.
 */
export default function Field({ id, label, icon: Icon, error, hint, hintTone, trailing, className, ...inputProps }) {
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={hasMessage ? messageId : undefined}
          className={cn(
            "h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground transition-colors",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
            Icon && "pl-10",
            trailing && "pr-11",
            error ? "border-danger focus-visible:border-danger focus-visible:ring-danger/30" : "border-border focus-visible:border-primary focus-visible:ring-primary/30",
            className,
          )}
          {...inputProps}
        />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>

      {hasMessage && (
        <p id={messageId} role={error ? "alert" : undefined} className={cn("text-xs", error ? "text-danger" : hintTone === "success" ? "font-medium text-success" : "text-muted-foreground")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
