"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatINR, formatINRCompact } from "@/lib/insights";

const COLORS = ["var(--primary)", "var(--info)", "var(--success)", "var(--warning)", "var(--danger)"];
const tick = { fontSize: 12, fill: "var(--muted-foreground)" };

function BreakdownTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { category, amount, share } = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-pop">
      <p className="font-medium text-foreground">{category}</p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground tabular-nums">{formatINR(amount)}</span> · {Math.round(share * 100)}%
      </p>
    </div>
  );
}

export default function BreakdownChart({ data }) {
  const height = Math.max(180, data.length * 48 + 16);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget by category</CardTitle>
        <CardDescription>Where your planned spend goes.</CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Nothing to break down yet.
          </div>
        ) : (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap={14}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="category" tick={tick} tickLine={false} axisLine={false} width={96} />
                <Tooltip content={<BreakdownTooltip />} cursor={{ fill: "var(--surface-muted)" }} />
                <Bar dataKey="amount" radius={[0, 6, 6, 0]} maxBarSize={22}>
                  {data.map((d, i) => (
                    <Cell key={d.category} fill={COLORS[i % COLORS.length]} />
                  ))}
                  <LabelList dataKey="amount" position="right" formatter={formatINRCompact} fill="var(--foreground)" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
