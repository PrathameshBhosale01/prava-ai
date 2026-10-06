"use client";

import { useState } from "react";
import Link from "next/link";
import { Plane } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { saveBudgetGoal, useInsightsData } from "@/hooks/useInsightsData";
import {
  buildSpendEntries,
  categoryBreakdown,
  computeSummary,
  monthlySeries,
  recentTrips,
  spentThisMonth,
} from "@/lib/insights";
import BreakdownChart from "./BreakdownChart";
import BudgetGoalCard from "./BudgetGoalCard";
import InsightsSummary from "./InsightsSummary";
import RecentTrips from "./RecentTrips";
import SpendingChart from "./SpendingChart";

export default function InsightsClient() {
  const { user } = useAuth();
  const { trips, goal, error, loading } = useInsightsData(user?.uid);
  const [months, setMonths] = useState(6);
  const [now] = useState(() => new Date());

  // Later: pass `expenses` here once the Expenses page stores them, and
  // `rates` ({ USD: 83.2 }) to include non-INR trips in the totals.
  const summary = computeSummary({ trips, now });
  const entries = buildSpendEntries({ trips });
  const series = monthlySeries(entries, months, now);
  const breakdown = categoryBreakdown(entries);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Insights</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your travel budget, trips and planning at a glance.</p>
      </header>

      {error ? (
        <Card className="border-danger/30 bg-danger-soft p-5 text-sm text-danger" role="alert">
          Couldn&apos;t load your insights. Check your connection and refresh the page.
        </Card>
      ) : !loading && trips.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Plane className="h-6 w-6" aria-hidden="true" />
          </span>
          <h2 className="text-base font-semibold text-foreground">No trips yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Plan your first trip and your budget, categories and trends will show up here.
          </p>
          <Link
            href="/trips/new"
            className="mt-2 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Plan a trip
          </Link>
        </Card>
      ) : (
        <>
          <InsightsSummary summary={summary} loading={loading} />

          <BudgetGoalCard
            key={goal ?? "none"}
            goal={goal}
            spent={spentThisMonth(entries, now)}
            loading={loading}
            onSave={(amount) => saveBudgetGoal(user.uid, amount)}
          />

          {loading ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-80 animate-pulse rounded-xl bg-surface-muted" />
              <div className="h-80 animate-pulse rounded-xl bg-surface-muted" />
            </div>
          ) : (
            <>
              <div className="grid gap-6 lg:grid-cols-2">
                <SpendingChart data={series} goal={goal} months={months} onMonthsChange={setMonths} />
                <BreakdownChart data={breakdown} />
              </div>
              <RecentTrips trips={recentTrips(trips)} />
            </>
          )}
        </>
      )}
    </div>
  );
}
