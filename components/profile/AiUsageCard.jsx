"use client";

import { useId, useState } from "react";
import { Sparkles } from "lucide-react";

import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { USAGE_TIMEZONE } from "@/lib/assistant/config";
import { buildSnapshot } from "@/lib/assistant/usage";
import { getMeterPercent, getMeterTone } from "@/lib/profileStats";
import { cn } from "@/lib/utils";

// Static class names so Tailwind can detect them.
const BAR_TONES = {
  primary: "bg-primary",
  warning: "bg-warning",
  danger: "bg-danger",
};

const RESET_LABEL =
  USAGE_TIMEZONE === "Asia/Kolkata" ? "midnight IST" : `midnight (${USAGE_TIMEZONE})`;

function Meter({ label, used, limit, remaining }) {
  const labelId = useId();
  const tone = getMeterTone({ used, limit });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {used} of {limit} used · {remaining} left
        </span>
      </div>

      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(used, limit)}
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", BAR_TONES[tone])}
          style={{ width: `${getMeterPercent({ used, limit })}%` }}
        />
      </div>
    </div>
  );
}

export default function AiUsageCard() {
  const { profile } = useAuth();

  // Fixed when the modal opens (this card only mounts then); the counters
  // themselves update live through the profile listener.
  const [now] = useState(() => new Date());

  const usage = profile ? buildSnapshot(profile, now) : null;

  return (
    <section
      aria-label="AI assistant usage"
      className="rounded-xl border border-primary/25 bg-primary-soft/50 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            AI assistant usage
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Resets daily at {RESET_LABEL}</p>
        </div>

        {usage ? (
          <span className="rounded-full border border-primary/40 px-2.5 py-0.5 text-xs font-medium text-primary">
            {usage.plan === "pro" ? "Pro" : "Free"}
          </span>
        ) : (
          <Skeleton className="h-5 w-12 rounded-full" />
        )}
      </div>

      <div className="mt-4 space-y-4">
        {usage ? (
          <>
            <Meter label="Trip plans" {...usage.plans} />
            <Meter label="Messages" {...usage.messages} />
          </>
        ) : (
          <div role="status" aria-label="Loading usage" className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}
      </div>
    </section>
  );
}