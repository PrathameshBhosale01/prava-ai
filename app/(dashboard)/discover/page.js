"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { greatCircleArc, haversineKm } from "@/lib/geo";
import { getMode } from "@/lib/travelModes";

// Leaflet touches `window` on import, so it must never render on the server.
// ssr: false is only allowed inside a Client Component (this page is one).
const DiscoverMap = dynamic(() => import("@/components/discover/DiscoverMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[350px] animate-pulse rounded-xl border bg-gray-100 md:h-[520px]" />
  ),
});

const fmtKm = (km) => Math.round(km).toLocaleString("en-US");

function fmtDuration(minutes) {
  const total = Math.round(minutes);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// "Mumbai" -> { lat, lng, name } | null (not found). Throws on network/server errors.
async function geocode(place, signal) {
  const res = await fetch(`/api/geocode?${new URLSearchParams({ destination: place })}`, {
    signal,
  });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data) throw new Error(data?.error || "Lookup failed");
  if (!data.available) return null;

  const { latitude, longitude, name, country } = data.location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return { lat: latitude, lng: longitude, name: country ? `${name}, ${country}` : name };
}

async function fetchRoad({ from, to }, signal) {
  const params = new URLSearchParams({
    fromLat: String(from.lat),
    fromLng: String(from.lng),
    toLat: String(to.lat),
    toLng: String(to.lng),
  });
  const res = await fetch(`/api/route?${params}`, { signal });
  const data = await res.json().catch(() => null);

  if (!res.ok || !data) throw new Error(data?.error || "Route lookup failed");
  return data;
}

export default function DiscoverPage() {
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [modeId, setModeId] = useState("flight");

  const [points, setPoints] = useState(null); // { from, to } after a successful search
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  // idle | loading | done | unavailable | error
  const [road, setRoad] = useState({ status: "idle" });

  // Used to ignore responses from an older search (stale-response guard)
  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  async function loadRoad(pts, requestId, signal) {
    setRoad({ status: "loading" });
    try {
      const data = await fetchRoad(pts, signal);
      if (requestId !== requestIdRef.current) return;

      setRoad(
        data.available
          ? {
              status: "done",
              coordinates: data.coordinates,
              distanceKm: data.distanceKm,
              durationMin: data.durationMin,
            }
          : { status: "unavailable" }
      );
    } catch (err) {
      if (err.name === "AbortError" || requestId !== requestIdRef.current) return;
      setRoad({ status: "error" });
    }
  }

  async function handleSearch(event) {
    event.preventDefault();

    const from = fromText.trim();
    const to = toText.trim();

    if (!from || !to) {
      setError("Enter both a starting point and a destination.");
      return;
    }
    if (from.length > 100 || to.length > 100) {
      setError("Place names are too long.");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setError("");
    setSearching(true);
    setRoad({ status: "idle" });

    try {
      const [a, b] = await Promise.all([
        geocode(from, controller.signal),
        geocode(to, controller.signal),
      ]);
      if (requestId !== requestIdRef.current) return;

      if (!a || !b) {
        setPoints(null);
        setError(
          `Couldn't find "${!a ? from : to}". Try adding the country, like "Paris, France".`
        );
        return;
      }

      if (haversineKm(a, b) < 1) {
        setPoints(null);
        setError("Start and destination are the same place.");
        return;
      }

      const pts = { from: a, to: b };
      setPoints(pts);

      if (getMode(modeId).kind === "road") loadRoad(pts, requestId, controller.signal);
    } catch (err) {
      if (err.name === "AbortError" || requestId !== requestIdRef.current) return;
      setPoints(null);
      setError("Couldn't load the route right now. Please try again.");
    } finally {
      if (requestId === requestIdRef.current) setSearching(false);
    }
  }

  function handleModeChange(id) {
    setModeId(id);

    // Road data is fetched lazily: only when a road mode is picked and we
    // don't already have it for the current from/to.
    if (
      points &&
      getMode(id).kind === "road" &&
      (road.status === "idle" || road.status === "error")
    ) {
      loadRoad(points, requestIdRef.current, abortRef.current?.signal);
    }
  }

  function handleClear() {
    abortRef.current?.abort();
    requestIdRef.current += 1;
    setFromText("");
    setToText("");
    setPoints(null);
    setError("");
    setSearching(false);
    setRoad({ status: "idle" });
  }

  const mode = getMode(modeId);

  // Everything the map needs, derived from state. useMemo keeps the object
  // stable between renders, so typing in the inputs doesn't make the map
  // re-fit itself.
  const view = useMemo(() => {
    if (!points) return null;

    const arc = greatCircleArc(points.from, points.to);
    const straightKm = haversineKm(points.from, points.to);
    const roadReady = mode.kind === "road" && road.status === "done";
    const roadPending =
      mode.kind === "road" && (road.status === "idle" || road.status === "loading");

    let line;
    let summary;
    let note = "";

    if (mode.kind === "arc") {
      line = arc;
      summary = `About ${fmtKm(straightKm)} km in a straight line`;
      note =
        mode.id === "flight"
          ? "Drawn as a great-circle arc. Real flight paths differ."
          : "Drawn as a straight-line path, not a real ferry route.";
    } else if (roadReady) {
      line = road.coordinates;
      summary = `${fmtKm(road.distanceKm)} km · about ${fmtDuration(road.durationMin)} by road`;
      if (mode.id !== "drive") {
        note = `${mode.label} uses the driving route as an approximation. No real ${mode.label.toLowerCase()} schedules.`;
      }
    } else if (roadPending) {
      line = null;
      summary = "Finding the road route…";
    } else {
      line = arc;
      summary = `About ${fmtKm(straightKm)} km in a straight line`;
      note =
        road.status === "unavailable"
          ? "No road route found (maybe across water), so a straight-line path is shown."
          : "Couldn't load the road route, so a straight-line path is shown.";
    }

    // The arc's longitudes are unwrapped past +/-180 for routes that cross the
    // Pacific, so the markers must use the arc's own endpoints to line up.
    const useArcEnds = line === arc;
    const start = useArcEnds
      ? { ...points.from, lat: arc[0][0], lng: arc[0][1] }
      : points.from;
    const end = useArcEnds
      ? { ...points.to, lat: arc[arc.length - 1][0], lng: arc[arc.length - 1][1] }
      : points.to;

    return {
      line,
      markers: [
        { kind: "start", ...start },
        { kind: "end", ...end },
      ],
      summary,
      note,
      busy: roadPending,
    };
  }, [points, mode, road]);

  const inputClass =
    "w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-500";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Discover Destinations</h1>
        <p className="mt-1 text-gray-600">
          Enter your route and the map will show the way.
        </p>
      </div>

      <form onSubmit={handleSearch} className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Trip Filters</h2>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="from" className="mb-1 block text-sm font-medium">
              From <span className="text-red-500">*</span>
            </label>
            <input
              id="from"
              value={fromText}
              onChange={(e) => setFromText(e.target.value)}
              placeholder="e.g. Mumbai"
              maxLength={100}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="to" className="mb-1 block text-sm font-medium">
              To <span className="text-red-500">*</span>
            </label>
            <input
              id="to"
              value={toText}
              onChange={(e) => setToText(e.target.value)}
              placeholder="e.g. Paris"
              maxLength={100}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={searching}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {searching ? "Searching…" : "Search & Show Route"}
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={searching}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-60"
          >
            Clear
          </button>
        </div>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Route Map</h2>

        <DiscoverMap
          markers={view?.markers ?? null}
          line={view?.line ?? null}
          mode={mode}
          onModeChange={handleModeChange}
          busy={view?.busy ?? false}
        />

        {view && (
          <div className="mt-3 text-sm">
            <p className="font-medium text-gray-900">
              {mode.icon} {view.markers[0].name} → {view.markers[1].name}
            </p>
            <p className="text-gray-600">{view.summary}</p>
            {view.note && <p className="mt-1 text-xs text-gray-500">{view.note}</p>}
          </div>
        )}

        <p className="mt-3 text-xs text-gray-400">
          Place search by Open-Meteo.com · Road routes by OSRM · Map data © OpenStreetMap
          contributors
        </p>
      </div>
    </div>
  );
}