import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
};

export default function StatCard({ icon: Icon, label, value, hint, tone = "primary", loading }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
      </div>

      {loading ? (
        <div className="mt-4 h-8 w-24 animate-pulse rounded-md bg-surface-muted" />
      ) : (
        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
      )}

      {hint && !loading && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
