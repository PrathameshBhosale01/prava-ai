import { Activity, PenLine, Plane, Wallet } from "lucide-react";

import { formatINRCompact } from "@/lib/insights";
import InsightChips from "./InsightChips";
import StatCard from "./StatCard";

export default function InsightsSummary({ summary, loading = false }) {
  return (
    <section aria-label="Summary" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Plane} tone="primary" label="Total trips" value={summary.totalTrips} loading={loading} />
        <StatCard icon={Wallet} tone="success" label="Total spent" value={formatINRCompact(summary.totalSpent)} loading={loading} />
        <StatCard icon={PenLine} tone="info" label="Blog posts" value={summary.blogPosts} loading={loading} />
        <StatCard icon={Activity} tone="warning" label="Activities" value={summary.activities} loading={loading} />
      </div>
      {!loading && <InsightChips summary={summary} />}
    </section>
  );
}
