"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Map, MapPin, RotateCw, Sparkles } from "lucide-react";

import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { computeTripStats } from "@/lib/profileStats";
import { getUserTrips } from "@/lib/tripService";

const TILES = [
  { key: "trips", label: "Trips", icon: Map },
  { key: "itineraries", label: "Itineraries", icon: Sparkles },
  { key: "destinations", label: "Destinations", icon: MapPin },
];

export default function ProfileStats() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [state, setState] = useState({ status: "loading", stats: null });
  const [attempt, setAttempt] = useState(0);

  // This component only mounts while the modal is open, so trips are
  // fetched when the profile is opened rather than on every page load.
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    getUserTrips(uid)
      .then((trips) => {
        if (!cancelled) setState({ status: "ready", stats: computeTripStats(trips) });
      })
      .catch((error) => {
        console.error("Failed to load profile stats:", error);
        if (!cancelled) setState({ status: "error", stats: null });
      });

    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  function retry() {
    setState({ status: "loading", stats: null });
    setAttempt((n) => n + 1);
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          We couldn&apos;t load your trip stats.
        </p>
        <Button variant="outline" size="sm" onClick={retry}>
          <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <dl className="grid grid-cols-3 gap-3" aria-busy={state.status === "loading"}>
      {TILES.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="rounded-xl border border-border bg-surface-muted/40 px-3 py-3 text-center"
        >
          <Icon className="mx-auto h-4 w-4 text-primary" aria-hidden="true" />
          <dd className="mt-1.5 text-xl font-semibold tracking-tight text-foreground">
            {state.stats ? state.stats[key] : <Skeleton className="mx-auto h-6 w-8" />}
          </dd>
          <dt className="text-xs text-muted-foreground">{label}</dt>
        </div>
      ))}
    </dl>
  );
}