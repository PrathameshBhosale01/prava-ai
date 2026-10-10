import { cn } from "@/lib/utils";

/** Shared look for every section: icon + heading, optional note, then content. */
export default function SectionCard({ id, icon: Icon, title, note, tone = "primary", className, children }) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  };
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <section id={id} aria-labelledby={headingId} className={cn("break-inside-avoid rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6", className)}>
      <div className="flex items-center gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 id={headingId} className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
