"use client";

import { Card } from "@/components/ui/Card";
import { formatMoney } from "@/lib/tools/currency";

/**
 * Share of spending per group as horizontal bars. The numbers are real text,
 * so it works for screen readers; the bars are decoration on top.
 * `groups`: Map<key, { total, count }> (already sorted, biggest first).
 */
export default function SpendingBreakdown({ title, groups, labelOf, currency, grandTotal }) {
  const rows = [...groups.entries()].filter(([, group]) => group.total > 0);
  if (rows.length === 0) return null;

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="space-y-3">
        {rows.map(([key, group]) => {
          const share = grandTotal > 0 ? (group.total / grandTotal) * 100 : 0;
          return (
            <li key={key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{labelOf(key)}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {formatMoney(group.total, currency)}
                  </span>{" "}
                  · {Math.round(share)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-500"
                  style={{ width: `${Math.max(share, 2)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
