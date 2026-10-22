
"use client";

import { useRef } from "react";
import { CalendarPlus, ChevronDown, FileJson, Lock, Share } from "lucide-react";
import { toast } from "sonner";

import { useUpgrade } from "@/components/billing/UpgradeProvider";
import { usePlan } from "@/hooks/usePlan";
import { buildIcs, buildTripJson, fileSlug, hasCalendarEvents } from "@/lib/trips/exportTrip";
import { can } from "@/lib/plans";

/** Saves text as a file in the browser. */
export function downloadText(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Pro: "Download JSON" and "Add to calendar (.ics)". Free users see a lock and get the upgrade dialog. */
export default function ExportMenu({ trip, days }) {
  const ref = useRef(null);
  const { openUpgrade } = useUpgrade();
  const { plan, ready } = usePlan();
  const allowed = !ready || can(plan, "exportData");
  const hasPlan = Boolean(trip?.itinerary);

  function run(action) {
    if (ref.current) ref.current.open = false;
    if (!allowed) return openUpgrade({ reason: "EXPORT", message: "Exporting your trip as JSON or to your calendar is a Pro feature." });
    action();
  }

  const exportJson = () =>
    downloadText(`${fileSlug(trip.title)}.json`, JSON.stringify(buildTripJson(trip), null, 2), "application/json");

  const exportIcs = () => {
    const itinerary = { ...trip.itinerary, days: days ?? trip.itinerary?.days };
    if (!hasCalendarEvents(itinerary)) return toast.error("Add a start date to this trip first, so the days have dates.");
    downloadText(`${fileSlug(trip.title)}.ics`, buildIcs(trip, itinerary), "text/calendar");
  };

  const item = "flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface-muted";

  return (
    <details ref={ref} className="relative print:hidden">
      <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg bg-white/90 px-3 text-xs font-medium text-slate-900 transition-colors hover:bg-white [&::-webkit-details-marker]:hidden">
        {allowed ? <Share className="h-3.5 w-3.5" aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" aria-hidden="true" />}
        Export
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </summary>
      <div className="absolute left-0 z-20 mt-1 w-56 rounded-xl border border-border bg-surface p-1 shadow-card">
        <button type="button" className={item} onClick={() => run(exportJson)}>
          <FileJson className="h-4 w-4" aria-hidden="true" />
          Download JSON
        </button>
        <button type="button" className={item} disabled={!hasPlan} onClick={() => run(exportIcs)}>
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Add to calendar (.ics)
        </button>
      </div>
    </details>
  );
}
