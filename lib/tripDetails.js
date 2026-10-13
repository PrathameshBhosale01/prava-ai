import { normalizeItinerary } from "./assistant/itinerary.js";
import { buildSchedule, shortPlace } from "./trips/stops.js";

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

/**
 * Booking / Expedia / Hotels.com searches for one property, pre-filled with guests and dates.
 * For a multi-city trip pass the hotel's `stop` (its city and its own check-in/out); without it
 * the whole trip's destination and dates are used, exactly as before.
 */
export function hotelLinks(hotel, trip, stop) {
  const place = [hotel?.name, stop?.place ?? trip?.destination].filter(Boolean).join(", ");
  const start = stop ? stop.checkIn : trip?.startDate;
  const checkIn = start && ISO_DATE.test(start) ? start : "";
  const checkOut = checkIn ? (stop ? stop.checkOut : addDays(checkIn, tripNights(trip))) : "";
  const guests = Math.max(Number(trip?.travelers) || 1, 1);

  const booking = `https://www.booking.com/searchresults.html?ss=${q(place)}${checkIn ? `&checkin=${checkIn}&checkout=${checkOut}` : ""}&group_adults=${guests}`;
  const stay = (host) => `https://www.${host}/Hotel-Search?destination=${q(place)}${checkIn ? `&startDate=${checkIn}&endDate=${checkOut}` : ""}&adults=${guests}`;

  return { booking, expedia: stay("expedia.com"), hotels: stay("hotels.com"), maps: mapsSearchUrl(place) };
}

/**
 * Maps / Directions / Explore for one activity. Uses the venue name + city, not the AI's address.
 * `city` is the day's own city on a multi-city trip; it defaults to the trip's destination.
 */
export function activityLinks(activity, trip, city = trip?.destination) {
  const place = [activity?.location || activity?.title, city].filter(Boolean).join(", ");
  return { maps: mapsSearchUrl(place), directions: mapsDirectionsUrl(place), explore: exploreUrl(`${activity?.title ?? place} ${city ?? ""}`.trim()) };
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

  const schedule = buildSchedule(trip);
  const stopById = new Map(schedule.stops.map((stop) => [stop.id, stop]));

  // A multi-city plan made by the route-aware generator: every day knows its city.
  const routeAware = schedule.stops.length > 1 && it.days.every((day) => stopById.has(day.stopId));

  const days = it.days.map((day) => {
    const date = day.date || addDays(trip?.startDate, day.day - 1);
    const stop = routeAware ? stopById.get(day.stopId) : null;
    return { ...day, date, dateLabel: formatDay(date), ...(stop && { stopPlace: stop.place, city: day.city || shortPlace(stop.place) }) };
  });

  const stops = routeAware
    ? schedule.stops.map((stop) => {
        const first = addDays(trip?.startDate, stop.firstDay - 1);
        const last = addDays(trip?.startDate, stop.lastDay - 1);
        return {
          ...stop,
          city: shortPlace(stop.place),
          stayLabel: formatDateRange(first, last),
          days: days.filter((day) => day.stopId === stop.id),
          hotels: (it.accommodations ?? []).filter((hotel) => hotel.stopId === stop.id),
        };
      })
    : null;

  const cityBudgets = routeAware
    ? (it.budgetByStop ?? [])
        .filter((entry) => stopById.has(entry.stopId))
        .map((entry) => ({
          stopId: entry.stopId,
          city: shortPlace(stopById.get(entry.stopId).place),
          accommodation: entry.accommodation ?? 0,
          food: entry.food ?? 0,
          activities: entry.activities ?? 0,
          total: (entry.accommodation ?? 0) + (entry.food ?? 0) + (entry.activities ?? 0),
        }))
    : [];

  const transferTotal = routeAware ? days.reduce((sum, day) => sum + (day.transfer?.price ?? 0), 0) : 0;

  const extras = [it.accommodations, it.budgetBreakdown, it.localCuisine, it.safetyTips, it.packingSuggestions, it.transportationTips, it.bestSeason];
  return {
    summary: it.summary,
    days,
    routeAware,
    stops,
    cityBudgets,
    transferTotal,
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
