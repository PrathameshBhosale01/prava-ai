import { Zap } from "lucide-react";

import { formatResetDate } from "@/lib/assistant/usage";

/** Compact "AI credits left this month" pill. Turns amber/red as the credits run low. */
export default function UsageMeter({ usage }) {
  if (!usage?.credits) return null;

  const { remaining, limit } = usage.credits;
  const low = Math.max(Math.ceil(limit * 0.1), usage.costs?.plan ?? 5);
  const tone =
    remaining === 0
      ? "border-danger/30 bg-danger-soft text-danger"
      : remaining <= low
        ? "border-warning/30 bg-warning-soft text-warning"
        : "border-border bg-surface text-muted-foreground";

  return (
    <span
      title={`${remaining} of ${limit} AI credits left this month. Resets on ${formatResetDate(usage.resetsOn)}.`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      <Zap size={12} aria-hidden="true" />
      {remaining}/{limit} credits left
    </span>
  );
}
