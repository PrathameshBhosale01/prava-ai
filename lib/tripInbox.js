/**
 * Pure helpers for the Trips Inbox.
 * No Firebase or React imports, so everything here is easy to test.
 */

import { cleanDestination, toDate } from "./insights.js";

export const PAGE_SIZE = 6;

const DAY_MS = 86_400_000;

export const STATUS_LABELS = {
  upcoming: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
  unscheduled: "Unscheduled",
};

export const SORT_OPTIONS = [
  { value: "newest", label: "Recently saved" },
  { value: "oldest", label: "Oldest saved" },
  { value: "start", label: "Start date" },
  { value: "budget", label: "Budget: high to low" },
  { value: "name", label: "Name: A to Z" },
];

/** "2026-08-08" -> local midnight Date (avoids the UTC off-by-one of new Date(str)). */
export function parseDateOnly(value) {
  if (typeof value !== "string") return toDate(value);

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return toDate(value);

  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/** "₹45,500", falling back to "INR 45,500" if the currency code is unknown. */
export function formatBudget(amount, currency = "INR") {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return "—";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: String(currency || "INR").toUpperCase(),
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-IN")}`;
  }
}

export function formatDuration(days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n} ${n === 1 ? "day" : "days"}`;
}

export function formatTravelers(count) {
  const n = Number(count);
  const safe = Number.isFinite(n) && n > 0 ? n : 1;
  return `${safe} ${safe === 1 ? "traveler" : "travelers"}`;
}

/** "8 Aug 2026" */
export function formatDate(date) {
  if (!date) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** upcoming | ongoing | completed | unscheduled. `now` is a Date. */
export function getTripStatus({ startDate, days }, now = new Date()) {
  if (!startDate) return "unscheduled";

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const length = Math.max(Number(days) || 1, 1);
  const end = new Date(startDate.getTime() + (length - 1) * DAY_MS);

  if (today < startDate) return "upcoming";
  if (today <= end) return "ongoing";
  return "completed";
}

/** Whole days until the trip starts (null if not upcoming). */
export function daysUntil(startDate, now = new Date()) {
  if (!startDate) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((startDate - today) / DAY_MS);

  return diff > 0 ? diff : null;
}

/** Firestore trip document -> the flat shape the inbox UI needs. */
export function normalizeInboxTrip(raw = {}, now = new Date()) {
  const startDate = parseDateOnly(raw.startDate);
  const days = Number(raw.duration) || 0;

  return {
    id: raw.id,
    title: String(raw.title || "").trim() || "Untitled trip",
    destination: cleanDestination(raw.destination) || "Unknown destination",
    startingFrom: String(raw.startingFrom || "").trim(),
    category: String(raw.category || "").trim(),
    interests: Array.isArray(raw.interests) ? raw.interests.filter(Boolean) : [],
    budget: Number(raw.budget) || 0,
    currency: String(raw.currency || "INR").toUpperCase(),
    days,
    travelers: Number(raw.travelers) || 1,
    startDate,
    createdAt: toDate(raw.createdAt),
    hasItinerary: Boolean(raw.itinerary),
    status: getTripStatus({ startDate, days }, now),
  };
}

function haystack(trip) {
  return [
    trip.title,
    trip.destination,
    trip.startingFrom,
    trip.category,
    ...trip.interests,
  ]
    .join(" ")
    .toLowerCase();
}

/** Every whitespace-separated word of `query` must appear somewhere in the trip. */
export function matchesQuery(trip, query = "") {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  const text = haystack(trip);
  return words.every((word) => text.includes(word));
}

const time = (date) => (date ? date.getTime() : 0);

const SORTERS = {
  newest: (a, b) => time(b.createdAt) - time(a.createdAt),
  oldest: (a, b) => time(a.createdAt) - time(b.createdAt),
  // Trips without a start date sink to the bottom.
  start: (a, b) =>
    (a.startDate ? time(a.startDate) : Infinity) -
    (b.startDate ? time(b.startDate) : Infinity),
  budget: (a, b) => b.budget - a.budget,
  name: (a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
};

/** Search + filter + sort. Never mutates `trips`. */
export function filterTrips(
  trips,
  { query = "", status = "all", category = "all", sort = "newest" } = {}
) {
  const sorter = SORTERS[sort] ?? SORTERS.newest;

  return trips
    .filter((trip) => matchesQuery(trip, query))
    .filter((trip) => status === "all" || trip.status === status)
    .filter((trip) => category === "all" || trip.category === category)
    .sort(sorter);
}

/** Counts per status for the filter chips. */
export function countByStatus(trips) {
  const counts = { all: trips.length, upcoming: 0, ongoing: 0, completed: 0, unscheduled: 0 };
  for (const trip of trips) counts[trip.status] += 1;
  return counts;
}

export function uniqueCategories(trips) {
  return [...new Set(trips.map((t) => t.category).filter(Boolean))].sort();
}

/** 1-based page slice. Out-of-range pages are clamped. */
export function paginate(items, page = 1, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);
  const current = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (current - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: current,
    totalPages,
    total: items.length,
  };
}

// ---------------------------------------------------------------------------
// URL state: /trips?q=kerala&status=upcoming&type=Family&sort=budget&page=2
// Defaults are omitted so the plain inbox URL stays clean.
// ---------------------------------------------------------------------------

export const DEFAULT_INBOX_STATE = {
  query: "",
  status: "all",
  category: "all",
  sort: "newest",
  page: 1,
};

const VALID_STATUSES = new Set(["all", ...Object.keys(STATUS_LABELS)]);
const VALID_SORTS = new Set(SORT_OPTIONS.map((o) => o.value));

/** Reads any URLSearchParams-like object (needs .get) into a safe inbox state. */
export function parseInboxParams(params) {
  const get = (key) => params?.get?.(key) ?? "";

  const status = get("status");
  const sort = get("sort");
  const page = Number.parseInt(get("page"), 10);

  return {
    query: get("q").trim(),
    status: VALID_STATUSES.has(status) ? status : DEFAULT_INBOX_STATE.status,
    category: get("type").trim() || DEFAULT_INBOX_STATE.category,
    sort: VALID_SORTS.has(sort) ? sort : DEFAULT_INBOX_STATE.sort,
    page: Number.isInteger(page) && page > 1 ? page : DEFAULT_INBOX_STATE.page,
  };
}

/** Inbox state -> query string (no leading "?"), omitting default values. */
export function buildInboxQuery(state) {
  const next = { ...DEFAULT_INBOX_STATE, ...state };
  const params = new URLSearchParams();

  const query = next.query.trim();
  if (query) params.set("q", query);
  if (next.status !== DEFAULT_INBOX_STATE.status) params.set("status", next.status);
  if (next.category !== DEFAULT_INBOX_STATE.category) params.set("type", next.category);
  if (next.sort !== DEFAULT_INBOX_STATE.sort) params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  return params.toString();
}
