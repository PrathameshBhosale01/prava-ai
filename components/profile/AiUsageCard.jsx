"use client";

import { useId, useState } from "react";
import { Sparkles } from "lucide-react";

import { useUpgrade } from "@/components/billing/UpgradeProvider";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { buildSnapshot, formatResetDate } from "@/lib/assistant/usage";
import { CREDIT_COSTS } from "@/lib/plans";
import { getMeterPercent, getMeterTone } from "@/lib/profileStats";
import { cn } from "@/lib/utils";

// Static class names so Tailwind can detect them.
const BAR_TONES = {
  primary: "bg-primary",
  warning: "bg-warning",
  danger: "bg-danger",
};

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
  const { openUpgrade } = useUpgrade();

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
          <p className="mt-0.5 text-xs text-muted-foreground">
            {usage ? `Credits reset on ${formatResetDate(usage.resetsOn)}` : "Monthly AI credits"}
          </p>
        </div>

        {usage ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-primary/40 px-2.5 py-0.5 text-xs font-medium text-primary">
              {usage.plan === "pro" ? "Pro" : "Free"}
            </span>
            {usage.plan === "free" && (
              <button
                type="button"
                onClick={() => openUpgrade({})}
                className="cursor-pointer rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                Upgrade
              </button>
            )}
          </div>
        ) : (
          <Skeleton className="h-5 w-12 rounded-full" />
        )}
      </div>

      <div className="mt-4 space-y-4">
        {usage ? (
          <>
            <Meter label="AI credits" {...usage.credits} />
            <p className="text-xs text-muted-foreground">
              A chat message uses {CREDIT_COSTS.message} credit. A full trip plan uses {CREDIT_COSTS.plan}.
            </p>
          </>
        ) : (
          <div role="status" aria-label="Loading usage" className="space-y-4">
            <Skeleton className="h-8 w-full" />
          </div>
        )}
      </div>
    </section>
  );
}