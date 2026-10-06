/**
 * Pure helpers for the Insights page. No Firebase imports here, so they are
 * easy to test and reuse. Firestore docs go through normalizeTrip() first;
 * if your field names differ, that is the ONLY place to change.
 */

/** Accepts Firestore Timestamp, Date, ISO string, or millis. Returns Date | null. */
export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DAY_MS = 86_400_000;

/** Whole days between two dates, inclusive of both ends. */
function inclusiveDays(start, end) {
  if (!start || !end || end < start) return 0;
  return Math.round((end - start) / DAY_MS) + 1;
}

/** "Japan, Japan" -> "Japan"; trims and drops repeated segments. */
export function cleanDestination(raw = "") {
  const seen = new Set();
  return String(raw)
    .split(",")
    .map((p) => p.trim())
    .filter((p) => {
      const key = p.toLowerCase();
      if (!p || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}

export function normalizeTrip(raw = {}) {
  const start = toDate(raw.startDate ?? raw.date ?? raw.createdAt);
  const end = toDate(raw.endDate);
  const cost = Number(raw.cost ?? raw.totalCost ?? raw.budget ?? 0) || 0;

  return {
    id: raw.id,
    destination: cleanDestination(raw.destination ?? raw.title ?? ""),
    category: raw.category ?? raw.tripType ?? "Other",
    cost,
    start,
    end,
    days: Number(raw.days ?? raw.duration) || inclusiveDays(start, end),
  };
}

/**
 * Favourite = most visited destination. Ties break by total spend, so the
 * result is deterministic instead of "whichever came first".
 */
export function favouriteDestination(trips) {
  const byPlace = new Map();
  for (const t of trips) {
    // Compare on the primary place ("Goa" from "Goa, India") so repeats group.
    const place = t.destination.split(",")[0]?.trim();
    if (!place) continue;
    const prev = byPlace.get(place) ?? { visits: 0, spend: 0 };
    byPlace.set(place, { visits: prev.visits + 1, spend: prev.spend + t.cost });
  }
  let best = null;
  for (const [place, s] of byPlace) {
    if (!best || s.visits > best.visits || (s.visits === best.visits && s.spend > best.spend)) {
      best = { place, ...s };
    }
  }
  return best?.place ?? null;
}

export function computeSummary({ trips = [], posts = [], activities = [] }) {
  const totalSpent = trips.reduce((sum, t) => sum + t.cost, 0);
  const daysOnRoad = trips.reduce((sum, t) => sum + t.days, 0);

  return {
    totalTrips: trips.length,
    totalSpent,
    blogPosts: posts.length,
    activities: activities.length,
    favourite: favouriteDestination(trips),
    daysOnRoad,
    avgPerTrip: trips.length ? Math.round(totalSpent / trips.length) : 0,
  };
}

/* ---------------- Currency formatting (Indian grouping) ---------------- */

const full = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatINR = (n) => full.format(Math.round(n || 0));

/** ₹664K -> ₹6.6L style, what Indian users actually read. */
export function formatINRCompact(n = 0) {
  const v = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (v >= 1e7) return `${sign}₹${trim(v / 1e7)}Cr`;
  if (v >= 1e5) return `${sign}₹${trim(v / 1e5)}L`;
  if (v >= 1e3) return `${sign}₹${trim(v / 1e3)}K`;
  return `${sign}₹${Math.round(v)}`;
}
const trim = (x) => x.toFixed(1).replace(/\.0$/, "");
