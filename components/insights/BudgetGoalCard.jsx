"use client";

import { useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatINR } from "@/lib/insights";
import { cn } from "@/lib/utils";

/** Remount with a new `key` when the saved goal changes so the input resets. */
export default function BudgetGoalCard({ goal, spent, onSave, loading }) {
  const [draft, setDraft] = useState(goal ? String(goal) : "");
  const [saving, setSaving] = useState(false);

  const amount = Number(draft);
  const valid = Number.isFinite(amount) && amount > 0;
  const dirty = valid && amount !== goal;

  const pct = goal ? (spent / goal) * 100 : 0;
  const over = goal && spent > goal;
  const tone = over ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-success";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSave(amount);
      toast.success("Budget goal saved");
    } catch {
      toast.error("Couldn't save your goal. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly budget goal</CardTitle>
        <CardDescription>Set a target for what you plan to spend on trips each month.</CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-2 md:gap-10">
        <form onSubmit={handleSubmit} className="space-y-2">
          <label htmlFor="budget-goal" className="text-sm font-medium text-foreground">
            Goal amount
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                ₹
              </span>
              <input
                id="budget-goal"
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. 50000"
                disabled={loading}
                className="h-10 w-full rounded-lg border border-border bg-surface pl-7 pr-3 text-sm text-foreground tabular-nums placeholder:text-muted-foreground disabled:opacity-60"
              />
            </div>
            <Button type="submit" disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save goal"}
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Planned this month</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatINR(spent)}
              {goal ? <span className="text-muted-foreground"> / {formatINR(goal)}</span> : null}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Share of monthly goal used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={goal ? Math.min(Math.round(pct), 100) : 0}
            className="h-2 overflow-hidden rounded-full bg-surface-muted"
          >
            <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>

          <p className={cn("text-xs", over ? "text-danger" : "text-muted-foreground")}>
            {!goal
              ? "Set a goal to track your progress."
              : over
                ? `${formatINR(spent - goal)} over your goal`
                : `${Math.round(pct)}% used · ${formatINR(goal - spent)} left`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
