"use client";

import { useRef, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/zone/ConfirmDialog";
import { auth } from "@/lib/firebase";

// The server allows the model up to 60 s (route maxDuration); give the browser a little longer.
const TIMEOUT_MS = 75_000;

/**
 * Generates (or regenerates) a trip's AI itinerary.
 * Regenerating replaces the saved plan, so it asks first. Every failure ends as a readable
 * message next to the button (never alert()), and the button is usable again right away.
 */
export default function GenerateItineraryButton({ tripId, hasItinerary = false, onGenerated, variant = "primary", size = "lg" }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const busy = useRef(false); // blocks a second request even within the same tick

  async function generate() {
    if (busy.current) return;
    busy.current = true;
    setConfirmOpen(false);
    setGenerating(true);
    setError("");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();

      let response;
      try {
        response = await fetch(`/api/trips/${encodeURIComponent(tripId)}/itinerary`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
      } catch (networkError) {
        throw new Error(networkError?.name === "AbortError" ? "That took too long. Please try again." : "Can't reach the server. Check your connection and try again.");
      }

      // A platform timeout or crash can answer with an HTML page instead of JSON.
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Couldn't generate the itinerary. Please try again.");
      if (!data?.itinerary) throw new Error("The server sent back an empty plan. Please try again.");

      toast.success(hasItinerary ? "New itinerary ready" : "Itinerary ready!");
      onGenerated?.(data.itinerary);
    } catch (err) {
      setError(err.message || "Couldn't generate the itinerary. Please try again.");
    } finally {
      clearTimeout(timer);
      busy.current = false;
      setGenerating(false);
    }
  }

  const Icon = hasItinerary ? RefreshCw : Sparkles;

  return (
    <div>
      <Button variant={variant} size={size} onClick={() => (hasItinerary ? setConfirmOpen(true) : generate())} disabled={generating}>
        {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
        {generating ? "Generating…" : hasItinerary ? "Regenerate itinerary" : "Generate itinerary"}
      </Button>

      <p role="status" className={generating ? "mt-3 text-sm text-muted-foreground" : "sr-only"}>
        {generating ? "Planning your trip… this can take up to a minute." : ""}
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Replace this itinerary?"
        description="We'll create a brand-new plan and your current one will be replaced. This can't be undone."
        confirmLabel="Replace it"
        onConfirm={generate}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
