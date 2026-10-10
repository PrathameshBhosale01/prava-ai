import { normalizeItinerary } from "./assistant/itinerary.js";

// Pure helpers behind the trip details page. No React, no DOM, no network, so they can be
// unit-tested. Everything that touches the AI's output goes through normalizeItinerary
// first, so the page never has to defend against odd shapes.

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* ------------------------------- dates -------------------------------- */

/** "2026-10-18" + 2 → "2026-10-20" (UTC math, so time zones and DST can't shift the day). "" for bad input. */
export function addDays(iso, days) {
  if (!ISO_DATE.test(iso ?? "")) return "";
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(t) ? "" : new Date(t + days * DAY_MS).toISOString().slice(0, 10);
}

const fmt = (iso, options) => (ISO_DATE.test(iso ?? "") ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...options }) : "");

/** "Sun, Oct 18" */
export const formatDay = (iso) => fmt(iso, { weekday: "short", month: "short", day: "numeric" });

/** "Oct 18 – Oct 22, 2026" ("" if the start date is missing) */
export function formatDateRange(startIso, endIso) {
  if (!fmt(startIso, {})) return "";
  const start = fmt(startIso, { month: "short", day: "numeric" });
  if (!fmt(endIso, {}) || endIso === startIso) return `${start}, ${fmt(startIso, { year: "numeric" })}`;
  return `${start} – ${fmt(endIso, { month: "short", day: "numeric", year: "numeric" })}`;
}

/** A trip of N days has N-1 nights (minimum 1): you check out on the last day. */
export const tripNights = (trip) => Math.max((Number(trip?.duration) || 1) - 1, 1);

export const tripEndDate = (trip) => addDays(trip?.startDate, Math.max((Number(trip?.duration) || 1) - 1, 0));

/* ------------------------------- money -------------------------------- */

/** 18500 + "INR" → "₹18,500". An unknown currency code falls back to "XYZ 18,500" instead of throwing. */
export function formatMoney(value, currency = "INR") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
  }
}

const BUDGET_LABELS = {
  accommodation: "Accommodation",
  food: "Food",
  transportation: "Transportation",
  activities: "Activities",
  miscellaneous: "Miscellaneous",
};

/**
 * Turns the AI's breakdown into rows + a comparison with the traveler's own budget.
 * The total is always computed from the rows (never trusted from the model).
 */
export function summarizeBudget(breakdown, budget) {
  const rows = Object.entries(breakdown ?? {})
    .filter(([key, amount]) => BUDGET_LABELS[key] && Number.isFinite(amount) && amount >= 0)
    .map(([key, amount]) => ({ key, label: BUDGET_LABELS[key], amount }));
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  const target = Number(budget);
  const hasBudget = Number.isFinite(target) && target > 0;
  return {
    rows: rows.map((row) => ({ ...row, percent: total > 0 ? Math.round((row.amount / total) * 100) : 0 })).sort((a, b) => b.amount - a.amount),
    total,
    hasBudget,
    budget: hasBudget ? target : 0,
    remaining: hasBudget ? target - total : 0,
    over: hasBudget && total > target,
    usedPercent: hasBudget ? Math.round((total / target) * 100) : 0,
  };
}

/* -------------------------------- links -------------------------------- */

// Deterministic search links built from names we already have. We never ask the AI for URLs
// (it would invent them); a search link always lands somewhere useful.
const q = encodeURIComponent;

export const mapsSearchUrl = (query) => `https://www.google.com/maps/search/?api=1&query=${q(query)}`;

export const mapsDirectionsUrl = (destination, origin) =>
  `https://www.google.com/maps/dir/?api=1&destination=${q(destination)}${origin ? `&origin=${q(origin)}` : ""}`;

export const exploreUrl = (query) => `https://www.google.com/search?q=${q(query)}`;

/** Booking / Expedia / Hotels.com searches for one property, pre-filled with the trip's dates and guests. */
export function hotelLinks(hotel, trip) {
  const place = [hotel?.name, trip?.destination].filter(Boolean).join(", ");
  const checkIn = trip?.startDate && ISO_DATE.test(trip.startDate) ? trip.startDate : "";
  const checkOut = checkIn ? addDays(checkIn, tripNights(trip)) : "";
  const guests = Math.max(Number(trip?.travelers) || 1, 1);

  const booking = `https://www.booking.com/searchresults.html?ss=${q(place)}${checkIn ? `&checkin=${checkIn}&checkout=${checkOut}` : ""}&group_adults=${guests}`;
  const stay = (host) => `https://www.${host}/Hotel-Search?destination=${q(place)}${checkIn ? `&startDate=${checkIn}&endDate=${checkOut}` : ""}&adults=${guests}`;

  return { booking, expedia: stay("expedia.com"), hotels: stay("hotels.com"), maps: mapsSearchUrl(place) };
}

/** Maps / Directions / Explore for one activity. Uses the venue name + city, not the AI's address. */
export function activityLinks(activity, trip) {
  const place = [activity?.location || activity?.title, trip?.destination].filter(Boolean).join(", ");
  return { maps: mapsSearchUrl(place), directions: mapsDirectionsUrl(place), explore: exploreUrl(`${activity?.title ?? place} ${trip?.destination ?? ""}`.trim()) };
}

/* ----------------------------- view model ------------------------------ */

/**
 * Everything the page needs from a stored itinerary, or null if it can't be read.
 *  - `isRich`: false for itineraries made before hotels/budget/tips existed, so the page can
 *    offer to regenerate instead of showing an oddly empty layout.
 *  - days always have a date (derived from the trip's start date when the model omitted it).
 */
export function buildItineraryView(itinerary, trip) {
  if (!itinerary) return null;
  let it;
  try {
    it = normalizeItinerary(itinerary);
  } catch {
    return null;
  }

  const days = it.days.map((day) => {
    const date = day.date || addDays(trip?.startDate, day.day - 1);
    return { ...day, date, dateLabel: formatDay(date) };
  });

  const extras = [it.accommodations, it.budgetBreakdown, it.localCuisine, it.safetyTips, it.packingSuggestions, it.transportationTips, it.bestSeason];
  return {
    summary: it.summary,
    days,
    accommodations: it.accommodations ?? [],
    budget: it.budgetBreakdown ? summarizeBudget(it.budgetBreakdown, trip?.budget) : null,
    localCuisine: it.localCuisine ?? [],
    safetyTips: it.safetyTips ?? [],
    packingSuggestions: it.packingSuggestions ?? [],
    transportationTips: it.transportationTips ?? "",
    bestSeason: it.bestSeason ?? "",
    isRich: extras.some(Boolean),
  };
}
