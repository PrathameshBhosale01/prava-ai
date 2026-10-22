"use client";

import { useRef, useState } from "react";
import { Loader2, Lock, RefreshCw, Wand2 } from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import { useUpgrade } from "@/components/billing/UpgradeProvider";
import { usePlan } from "@/hooks/usePlan";
import { upgradeFromResponse } from "@/lib/billing/upgrade";
import { auth } from "@/lib/firebase";
import { CREDIT_COSTS, can } from "@/lib/plans";
import { MAX_INSTRUCTION_CHARS, dayEditKind } from "@/lib/trips/dayEdit";

const TIMEOUT_MS = 75_000;

const credits = (n) => `${n} credit${n === 1 ? "" : "s"}`;

/**
 * Pro tool under each day: redo this one day, optionally following an instruction ("more food, less walking").
 * Free users see the same box with a lock; pressing the button opens the upgrade dialog.
 */
export default function DayAiEditor({ tripId, day, onChange }) {
  const [instruction, setInstruction] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const { openUpgrade } = useUpgrade();
  const { plan, ready } = usePlan();

  const kind = dayEditKind(instruction);
  const allowed = !ready || can(plan, kind === "refine" ? "refine" : "dayRegenerate");
  const label = kind === "refine" ? "Refine this day" : "Regenerate this day";
  const cost = CREDIT_COSTS[kind];

  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    if (!allowed) {
      return openUpgrade({
        reason: kind === "refine" ? "REFINE" : "DAY_REGENERATE",
        message: kind === "refine" ? "Refining a day with AI is a Pro feature." : "Regenerating a single day is a Pro feature.",
      });
    }

    busy.current = true;
    setWorking(true);
    setError("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();

      let response;
      try {
        response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/itinerary/day`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ day, instruction }),
          signal: controller.signal,
        });
      } catch (networkError) {
        throw new Error(networkError?.name === "AbortError" ? "That took too long. Please try again." : "Can't reach the server. Check your connection and try again.");
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const upgrade = upgradeFromResponse(data);
        if (upgrade) openUpgrade(upgrade);
        throw new Error(data?.error || "Couldn't update this day. Please try again.");
      }
      if (!data?.itinerary) throw new Error("The server sent back an empty plan. Please try again.");

      onChange?.(data.itinerary);
      setInstruction("");
      toast.success(`Day ${day} updated`);
    } catch (err) {
      setError(err.message || "Couldn't update this day. Please try again.");
    } finally {
      clearTimeout(timer);
      busy.current = false;
      setWorking(false);
    }
  }

  const Icon = kind === "refine" ? Wand2 : RefreshCw;

  return (
    <form onSubmit={submit} className="mt-5 rounded-xl border border-dashed border-border bg-surface-muted/50 p-4 print:hidden">
      <label htmlFor={`day-ai-${day}`} className="text-sm font-medium text-foreground">
        Not feeling this day?
      </label>
      <p className="mt-0.5 text-xs text-muted-foreground">Leave it empty for a fresh alternative, or tell the AI what to change. Only this day is replaced.</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id={`day-ai-${day}`}
          type="text"
          value={instruction}
          maxLength={MAX_INSTRUCTION_CHARS}
          onChange={(e) => setInstruction(e.target.value)}
          disabled={working}
          placeholder="e.g. more food spots, fewer long walks"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <Button type="submit" variant="outline" size="md" disabled={working}>
          {working ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : allowed ? <Icon className="h-4 w-4" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
          {working ? "Working…" : `${label} · ${credits(cost)}`}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
