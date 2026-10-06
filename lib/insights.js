/**
 * Pure helpers for the Insights page.
 * No Firebase imports here, so they are easy to test and reuse.
 */

const DAY_MS = 86_400_000;

/** Accepts Firestore Timestamp, Date, ISO string, or millis. */
export function toDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const d = value instanceof Date ? value : new Date(value);

  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole days between two dates, inclusive of both ends. */
function inclusiveDays(start, end) {
  if (!start || !end || end < start) return 0;

  return Math.round((end - start) / DAY_MS) + 1;
}

/** "Japan, Japan" -> "Japan". */
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

/**
 * Normalize a Firestore trip document into the shape
 * used throughout the Insights page.
 */
export function normalizeTrip(raw = {}) {
  const start = toDate(raw.startDate ?? raw.date ?? raw.createdAt);
  const end = toDate(raw.endDate);

  const cost =
    Number(raw.cost ?? raw.totalCost ?? raw.budget ?? 0) || 0;

  return {
    id: raw.id,
    title: raw.title ?? "",
    destination: cleanDestination(
      raw.destination ?? raw.title ?? ""
    ),
    category: raw.category ?? raw.tripType ?? "Other",
    cost,
    start,
    end,
    days:
      Number(raw.days ?? raw.duration) ||
      inclusiveDays(start, end),
  };
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                    */
/* -------------------------------------------------------------------------- */

export function favouriteDestination(trips = []) {
  const byPlace = new Map();

  for (const t of trips) {
    const place = t.destination?.split(",")[0]?.trim();

    if (!place) continue;

    const prev = byPlace.get(place) ?? {
      visits: 0,
      spend: 0,
    };

    byPlace.set(place, {
      visits: prev.visits + 1,
      spend: prev.spend + t.cost,
    });
  }

  let best = null;

  for (const [place, stats] of byPlace) {
    if (
      !best ||
      stats.visits > best.visits ||
      (stats.visits === best.visits &&
        stats.spend > best.spend)
    ) {
      best = {
        place,
        ...stats,
      };
    }
  }

  return best?.place ?? null;
}

export function computeSummary({
  trips = [],
  posts = [],
  activities = [],
} = {}) {
  const totalSpent = trips.reduce(
    (sum, trip) => sum + (Number(trip.cost) || 0),
    0
  );

  const daysOnRoad = trips.reduce(
    (sum, trip) => sum + (Number(trip.days) || 0),
    0
  );

  return {
    totalTrips: trips.length,
    totalSpent,
    blogPosts: posts.length,
    activities: activities.length,
    favourite: favouriteDestination(trips),
    daysOnRoad,
    avgPerTrip: trips.length
      ? Math.round(totalSpent / trips.length)
      : 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Spend entries                                                              */
/* -------------------------------------------------------------------------- */

export function buildSpendEntries({ trips = [] } = {}) {
  return trips
    .filter((trip) => trip.start && Number(trip.cost) > 0)
    .map((trip) => ({
      id: trip.id,
      date: trip.start,
      spend: Number(trip.cost) || 0,
      amount: Number(trip.cost) || 0,
      category: trip.category || "Other",
      destination: trip.destination || "",
      trip,
    }));
}

/* -------------------------------------------------------------------------- */
/* Monthly spending                                                           */
/* -------------------------------------------------------------------------- */

function monthStart(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

export function monthlySeries(
  entries = [],
  months = 6,
  now = new Date()
) {
  const current = toDate(now) ?? new Date();

  const result = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(
      current.getFullYear(),
      current.getMonth() - i,
      1
    );

    const key = monthKey(date);

    const spend = entries
      .filter((entry) => {
        const entryDate = toDate(entry.date);

        return (
          entryDate &&
          monthKey(entryDate) === key
        );
      })
      .reduce(
        (sum, entry) => sum + (Number(entry.spend) || 0),
        0
      );

    result.push({
      key,
      label: date.toLocaleDateString("en-IN", {
        month: "short",
      }),
      spend,
    });
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/* Category breakdown                                                         */
/* -------------------------------------------------------------------------- */

export function categoryBreakdown(entries = []) {
  const totals = new Map();

  for (const entry of entries) {
    const category = entry.category || "Other";
    const amount = Number(entry.amount ?? entry.spend) || 0;

    totals.set(
      category,
      (totals.get(category) || 0) + amount
    );
  }

  const total = Array.from(totals.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      share: total ? amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/* -------------------------------------------------------------------------- */
/* Current month                                                              */
/* -------------------------------------------------------------------------- */

export function spentThisMonth(
  entries = [],
  now = new Date()
) {
  const current = toDate(now) ?? new Date();

  return entries
    .filter((entry) => {
      const date = toDate(entry.date);

      return (
        date &&
        date.getFullYear() === current.getFullYear() &&
        date.getMonth() === current.getMonth()
      );
    })
    .reduce(
      (sum, entry) => sum + (Number(entry.spend) || 0),
      0
    );
}

/* -------------------------------------------------------------------------- */
/* Recent trips                                                               */
/* -------------------------------------------------------------------------- */

export function recentTrips(trips = [], limit = 5) {
  return [...trips]
    .sort((a, b) => {
      const aTime = a.start?.getTime?.() ?? 0;
      const bTime = b.start?.getTime?.() ?? 0;

      return bTime - aTime;
    })
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Currency formatting                                                        */
/* -------------------------------------------------------------------------- */

const full = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatINR = (n) =>
  full.format(Math.round(n || 0));

const trim = (x) =>
  x.toFixed(1).replace(/\.0$/, "");

export function formatINRCompact(n = 0) {
  const value = Number(n) || 0;
  const v = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (v >= 1e7) {
    return `${sign}₹${trim(v / 1e7)}Cr`;
  }

  if (v >= 1e5) {
    return `${sign}₹${trim(v / 1e5)}L`;
  }

  if (v >= 1e3) {
    return `${sign}₹${trim(v / 1e3)}K`;
  }

  return `${sign}₹${Math.round(v)}`;
}

/* -------------------------------------------------------------------------- */
/* Trip formatting                                                            */
/* -------------------------------------------------------------------------- */

export function formatTripBudget(trip) {
  return formatINR(trip?.cost ?? 0);
}

export function formatTripDate(value) {
  const date = toDate(value);

  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}