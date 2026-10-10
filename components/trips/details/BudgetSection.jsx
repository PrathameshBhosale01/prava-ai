import { Banknote } from "lucide-react";

import { formatMoney } from "@/lib/tripDetails";
import { cn } from "@/lib/utils";

import SectionCard from "./SectionCard";

/** Estimated costs by category, compared with the traveler's own budget. */
export default function BudgetSection({ budget, trip }) {
  const money = (value) => formatMoney(value, trip.currency);
  const barTone = budget.over ? "bg-danger" : budget.usedPercent >= 90 ? "bg-warning" : "bg-success";

  return (
    <SectionCard
      id="trip-budget"
      icon={Banknote}
      tone="warning"
      title="Budget breakdown"
      note={`Estimated for all ${trip.travelers || 1} traveler${Number(trip.travelers) === 1 ? "" : "s"}, in ${trip.currency || "your currency"}. Real costs will vary.`}
    >
      <ul className="space-y-3.5">
        {budget.rows.map((row) => (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums text-foreground">
                {money(row.amount)} <span className="text-xs font-normal text-muted-foreground">({row.percent}%)</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary/70" style={{ width: `${row.percent}%` }} />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Estimated total</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{money(budget.total)}</span>
        </div>

        {budget.hasBudget && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Your budget: {money(budget.budget)}</span>
              <span>{budget.usedPercent}% used</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`Estimated cost is ${budget.usedPercent}% of your budget`}>
              <div className={cn("h-full rounded-full transition-all", barTone)} style={{ width: `${Math.min(budget.usedPercent, 100)}%` }} />
            </div>
            <p role="status" className={cn("mt-2 text-sm font-medium", budget.over ? "text-danger" : "text-success")}>
              {budget.over ? `${money(Math.abs(budget.remaining))} over your budget` : budget.remaining === 0 ? "Right on your budget" : `${money(budget.remaining)} left in your budget`}
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
