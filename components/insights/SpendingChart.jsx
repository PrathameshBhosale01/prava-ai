"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatINR, formatINRCompact } from "@/lib/insights";
import { cn } from "@/lib/utils";

const RANGES = [6, 12];
const tick = { fontSize: 12, fill: "var(--muted-foreground)" };

export function ChartTooltip({ active, payload, label, valueLabel = "Spend" }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-pop">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">
        {valueLabel}: <span className="font-medium text-foreground tabular-nums">{formatINR(payload[0].value)}</span>
      </p>
    </div>
  );
}

export default function SpendingChart({ data, goal, months, onMonthsChange }) {
  const hasData = data.some((d) => d.spend > 0);

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div>
          <CardTitle>Monthly spending</CardTitle>
          <CardDescription>Planned trip budgets by start month.</CardDescription>
        </div>

        <div role="group" aria-label="Time range" className="flex rounded-lg border border-border bg-surface-muted p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={months === r}
              onClick={() => onMonthsChange(r)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                months === r ? "bg-surface text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}M
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative h-64 w-full">
          {!hasData && (
            <p className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
              No trips starting in this period.
            </p>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis
                tick={tick}
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={formatINRCompact}
                domain={[0, (max) => Math.max(max, goal || 0, 1000) * 1.15]}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
              {goal ? (
                <ReferenceLine
                  y={goal}
                  stroke="var(--success)"
                  strokeDasharray="5 4"
                  label={{ value: `Goal ${formatINRCompact(goal)}`, position: "insideTopRight", fill: "var(--success)", fontSize: 12 }}
                />
              ) : null}
              {/* "monotone" never overshoots below zero like a plain spline does */}
              <Area
                type="monotone"
                dataKey="spend"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#spendFill)"
                dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
