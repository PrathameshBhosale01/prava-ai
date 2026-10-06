import { Zap } from "lucide-react";

/** Compact "trip plans left today" pill. Turns amber/red as the quota runs low. */
export default function UsageMeter({ usage }) {
  if (!usage) return null;

  const { plans, messages } = usage;
  const tone =
    plans.remaining === 0 || messages.remaining === 0
      ? "border-danger/30 bg-danger-soft text-danger"
      : plans.remaining === 1
         ? "border-warning/30 bg-warning-soft text-warning"
        : "border-border bg-surface text-muted-foreground";

  return (
    <span
      title={`${plans.remaining} of ${plans.limit} trip plans and ${messages.remaining} of ${messages.limit} messages left today`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      <Zap size={12} />
      {plans.remaining}/{plans.limit} plans left today
    </span>
  );
}