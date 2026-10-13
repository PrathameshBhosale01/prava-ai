// Multi-city / multi-country trips: everything about a trip's ROUTE, as pure functions.
// No React, no DOM, no network, no imports from other trip modules, so it is easy to unit-test
// and every other module (form, prompt, details page, inbox) can depend on it.
//
// A trip's route is an ordered list of stops. Each stop:
//   { id, place, nights, travelMode?, country?, countryCode?, lat?, lon? }
//   - travelMode = how you get here from the previous point (falls back to trip.transportation)
//   - country/countryCode/lat/lon come from the place autocomplete and are always optional
//
// Trip documents written before this feature have no `stops`. getStops() turns their old
// `destination` + `duration` into a single stop on the fly, so nothing needs migrating.
//
// Day math (the app owns it, the AI only fills in content):
//   - A trip of N days has N-1 nights, so total days = sum(nights) + 1.
//   - Stop i owns days firstDay..firstDay+nights-1. You travel on the first day of each later
//     stop. The LAST stop also owns the final (departure) day.
//   - checkIn = date of firstDay, checkOut = checkIn + nights.

import { MAX_TRIP_DAYS, TRIP_OPTIONS } from "../assistant/config.js";

export const MAX_STOPS = 6;
export const MAX_STOP_NIGHTS = 20;
export { MAX_TRIP_DAYS };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

// Rough ceiling (km) before a slow mode becomes a bad idea for ONE leg. Flights have none.
const SLOW_MODE_MAX_KM = { Bike: 300, Car: 900, Bus: 900, Train: 1800 };

/* ------------------------------ small utils ------------------------------ */

function addIsoDays(iso, days) {
  if (!ISO_DATE.test(iso ?? "")) return "";
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(t) ? "" : new Date(t + days * DAY_MS).toISOString().slice(0, 10);
}

function cleanText(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function toInt(value) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n) : null;
}

/** "Goa, India" → "Goa". The short name is what cards and route labels show. */
export function shortPlace(place) {
  return cleanText(place, 120).split(",")[0].trim();
}

const sameCity = (a, b) => shortPlace(a).toLowerCase() === shortPlace(b).toLowerCase();

let idCounter = 0;
/** A short unique id for a new stop. Call from event handlers, not during render. */
export function newStopId() {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  idCounter += 1;
  return `s_${random}${idCounter.toString(36)}`;
}

/* -------------------------------- sanitize -------------------------------- */

/** Minimum nights for a stop: a one-stop trip may be a day trip (0 nights), a multi-stop one may not. */
const minNights = (stopCount) => (stopCount > 1 ? 1 : 0);

/**
 * Cleans ONE stop. Returns null if it has no place. Optional fields are left out entirely
 * (never `undefined`) because Firestore refuses to save undefined values.
 */
export function sanitizeStop(raw, { index = 0, stopCount = 1 } = {}) {
  const place = cleanText(raw?.place, 120);
  if (!place) return null;

  const nightsRaw = toInt(raw?.nights);
  const nights = Math.min(Math.max(nightsRaw ?? 1, minNights(stopCount)), MAX_STOP_NIGHTS);

  const stop = {
    id: cleanText(raw?.id, 40) || `stop-${index + 1}`,
    place,
    nights,
  };

  const mode = TRIP_OPTIONS.transportations.find((m) => m.toLowerCase() === String(raw?.travelMode ?? "").trim().toLowerCase());
  if (mode) stop.travelMode = mode;

  const country = cleanText(raw?.country, 60);
  if (country) stop.country = country;

  const code = typeof raw?.countryCode === "string" ? raw.countryCode.trim().toUpperCase() : "";
  if (/^[A-Z]{2}$/.test(code)) stop.countryCode = code;

  const lat = typeof raw?.lat === "number" ? raw.lat : NaN;
  const lon = typeof raw?.lon === "number" ? raw.lon : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    stop.lat = lat;
    stop.lon = lon;
  }

  return stop;
}

/** Cleans a whole list: drops empty stops, makes ids unique, caps the count. */
export function sanitizeStops(list) {
  const input = (Array.isArray(list) ? list : []).filter((s) => cleanText(s?.place, 120)).slice(0, MAX_STOPS);
  const seen = new Set();
  const out = [];
  input.forEach((raw, index) => {
    const stop = sanitizeStop(raw, { index, stopCount: input.length });
    if (!stop) return;
    if (seen.has(stop.id)) stop.id = `stop-${index + 1}`;
    while (seen.has(stop.id)) stop.id += "x";
    seen.add(stop.id);
    out.push(stop);
  });
  return out;
}

/* ------------------------------ reading a trip ------------------------------ */

/**
 * The trip's stops, in order. New trips: trip.stops. Older trips: one stop built from the old
 * `destination` and `duration`. Returns [] only if the trip has no place at all.
 */
export function getStops(trip) {
  const stored = sanitizeStops(trip?.stops);
  if (stored.length > 0) return stored;

  const place = cleanText(trip?.destination, 120);
  if (!place) return [];
  const days = Math.max(toInt(trip?.duration) ?? 1, 1);
  return [{ id: "stop-1", place, nights: Math.min(days - 1, MAX_STOP_NIGHTS) }];
}

export const isMultiStop = (trip) => getStops(trip).length > 1;

/** Total days of the route: sum(nights) + 1. For an older trip this equals its `duration`. */
export const totalDays = (stops) => (Array.isArray(stops) ? stops.reduce((sum, s) => sum + (s.nights || 0), 0) + 1 : 1);

/** Where the trip ends: null (one-way), the open-jaw city, or back at the start. */
export function tripEndpoint(trip) {
  if (trip?.oneWay === true) return null;
  return cleanText(trip?.endingAt, 120) || cleanText(trip?.startingFrom, 120) || null;
}

/** Distinct countries in visiting order (needs the autocomplete data; otherwise []). */
export function tripCountries(stops) {
  const seen = new Map();
  for (const s of stops ?? []) {
    const key = s.countryCode || s.country?.toLowerCase();
    if (key && !seen.has(key)) seen.set(key, s.country || s.countryCode);
  }
  return [...seen.values()];
}

export const isInternational = (stops) => tripCountries(stops).length > 1;

/* --------------------------------- schedule --------------------------------- */

/**
 * Which day of the trip is spent in which stop, with real dates.
 * `startDate` may be missing, in which case every date is "".
 *
 * @returns {{ totalDays, startDate, endDate, stops: Array, days: Array }}
 *   stops[i]: { ...stop, index, firstDay, lastDay, dayCount, checkIn, checkOut }
 *   days[d]:  { day, date, stopId, stopIndex, place, isArrivalDay, isLastDay }
 */
export function buildSchedule(trip) {
  const stops = getStops(trip);
  const startDate = ISO_DATE.test(trip?.startDate ?? "") ? trip.startDate : "";
  const total = totalDays(stops);
  const dateOf = (day) => (startDate ? addIsoDays(startDate, day - 1) : "");

  let cursor = 1;
  const scheduled = stops.map((stop, index) => {
    const isLast = index === stops.length - 1;
    const firstDay = cursor;
    const dayCount = stop.nights + (isLast ? 1 : 0);
    cursor += stop.nights;
    return {
      ...stop,
      index,
      firstDay,
      lastDay: firstDay + Math.max(dayCount, 1) - 1,
      dayCount,
      checkIn: dateOf(firstDay),
      checkOut: dateOf(firstDay + stop.nights),
    };
  });

  const days = [];
  for (const stop of scheduled) {
    for (let d = stop.firstDay; d < stop.firstDay + stop.dayCount; d += 1) {
      days.push({
        day: d,
        date: dateOf(d),
        stopId: stop.id,
        stopIndex: stop.index,
        place: stop.place,
        isArrivalDay: d === stop.firstDay,
        isLastDay: d === total,
      });
    }
  }

  return { totalDays: total, startDate, endDate: dateOf(total), stops: scheduled, days };
}

/* ----------------------------------- legs ----------------------------------- */

const EARTH_KM = 6371;
const rad = (deg) => (deg * Math.PI) / 180;

/** Straight-line distance in km between two {lat, lon}; null if either has no coordinates. */
export function distanceKm(a, b) {
  if (![a?.lat, a?.lon, b?.lat, b?.lon].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * EARTH_KM * Math.asin(Math.sqrt(h)));
}

/**
 * The journeys of the trip, in order: outbound (start → first stop), between stops, and the
 * return (last stop → end). Each has the trip day it happens on and, when both ends have
 * coordinates, a straight-line distance.
 */
export function buildLegs(trip) {
  const { stops, totalDays: total } = buildSchedule(trip);
  if (stops.length === 0) return [];

  const defaultMode = TRIP_OPTIONS.transportations.includes(trip?.transportation) ? trip.transportation : "Mixed";
  const modeFor = (stop) => stop.travelMode || defaultMode;
  const dateOf = (day) => (ISO_DATE.test(trip?.startDate ?? "") ? addIsoDays(trip.startDate, day - 1) : "");
  const legs = [];

  const origin = cleanText(trip?.startingFrom, 120);
  if (origin) {
    legs.push({ kind: "outbound", from: origin, to: stops[0].place, toStopId: stops[0].id, mode: modeFor(stops[0]), day: 1, date: dateOf(1), distanceKm: null });
  }

  for (let i = 1; i < stops.length; i += 1) {
    const from = stops[i - 1];
    const to = stops[i];
    legs.push({ kind: "between", from: from.place, to: to.place, fromStopId: from.id, toStopId: to.id, mode: modeFor(to), day: to.firstDay, date: to.checkIn, distanceKm: distanceKm(from, to) });
  }

  const end = tripEndpoint(trip);
  if (end) {
    const last = stops[stops.length - 1];
    legs.push({ kind: "return", from: last.place, to: end, fromStopId: last.id, mode: defaultMode, day: total, date: dateOf(total), distanceKm: null });
  }

  return legs;
}

/* -------------------------------- validation -------------------------------- */

/** Advice that never blocks saving: repeated cities and slow transport over a long distance. */
function routeWarnings(clean, transportation) {
  const warnings = [];
  for (let i = 1; i < clean.length; i += 1) {
    const prev = clean[i - 1];
    const cur = clean[i];
    if (sameCity(prev.place, cur.place)) {
      warnings.push(`${shortPlace(cur.place)} appears twice in a row. Combine them into one longer stay?`);
    }
    const mode = cur.travelMode || (TRIP_OPTIONS.transportations.includes(transportation) ? transportation : "Mixed");
    const km = distanceKm(prev, cur);
    const limit = SLOW_MODE_MAX_KM[mode];
    if (km !== null && limit && km > limit) {
      warnings.push(`${shortPlace(prev.place)} → ${shortPlace(cur.place)} by ${mode} is about ${km.toLocaleString("en-US")} km. Consider a flight for this leg.`);
    }
  }
  return warnings;
}

/**
 * Checks a route before saving. `error` is a friendly sentence for the form (null when OK);
 * `warnings` are advice that never blocks saving. `stops` is the cleaned list to store.
 */
export function validateRoute({ stops, startingFrom, transportation } = {}) {
  const raw = Array.isArray(stops) ? stops : [];
  const fail = (error) => {
    const cleaned = sanitizeStops(raw);
    return { ok: false, error, warnings: routeWarnings(cleaned, transportation), stops: cleaned };
  };

  if (cleanText(startingFrom, 120) === "") return fail("Starting location is required.");
  if (raw.length === 0) return fail("Add at least one destination.");
  if (raw.length > MAX_STOPS) return fail(`A trip can have up to ${MAX_STOPS} destinations.`);

  const missing = raw.findIndex((s) => !cleanText(s?.place, 120));
  if (missing !== -1) return fail(raw.length === 1 ? "Destination is required." : `Destination ${missing + 1} is empty. Add a place or remove it.`);

  const minimum = minNights(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    const n = toInt(raw[i]?.nights);
    const label = shortPlace(raw[i].place);
    if (n === null || n < minimum) {
      return fail(raw.length === 1 ? "Duration must be greater than zero." : `${label} needs at least 1 night.`);
    }
    if (n > MAX_STOP_NIGHTS) return fail(`${label} can have at most ${MAX_STOP_NIGHTS} nights.`);
  }

  const clean = sanitizeStops(raw);
  const total = totalDays(clean);
  if (total > MAX_TRIP_DAYS) {
    return fail(`That's ${total} days in total. A trip can be at most ${MAX_TRIP_DAYS} days, so shorten a stay or remove a stop.`);
  }

  const warnings = routeWarnings(clean, transportation);

  return { ok: true, error: null, warnings, stops: clean };
}

/* ------------------------------- list editing ------------------------------- */
// Immutable helpers the route builder uses, so reorder/remove/add rules are tested here once.

/**
 * Appends a stop. Returns the same array if the trip is already at MAX_STOPS. A one-stop trip
 * may be a day trip (0 nights), but once there are two stops every stop needs a night, so the
 * first one is bumped to 1.
 */
export function addStop(stops, stop = {}) {
  if (stops.length >= MAX_STOPS) return stops;
  const base = stops.length === 1 && (stops[0].nights ?? 0) < 1 ? [{ ...stops[0], nights: 1 }] : stops;
  return [...base, { id: newStopId(), place: "", nights: 2, ...stop }];
}

/** Puts a stop back at `index` (used by "Undo" after a remove). No-op if full or already present. */
export function insertStopAt(stops, stop, index) {
  if (stops.length >= MAX_STOPS || stops.some((s) => s.id === stop.id)) return stops;
  const at = Math.min(Math.max(Number(index) || 0, 0), stops.length);
  return [...stops.slice(0, at), stop, ...stops.slice(at)];
}

/** Removes a stop by id. The last remaining stop can't be removed (returns the same array). */
export function removeStop(stops, id) {
  if (stops.length <= 1 || !stops.some((s) => s.id === id)) return stops;
  return stops.filter((s) => s.id !== id);
}

/** Moves a stop up (-1) or down (+1), staying inside the list. */
export function moveStop(stops, id, delta) {
  const from = stops.findIndex((s) => s.id === id);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= stops.length || delta === 0) return stops;
  const next = [...stops];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** Changes some fields of one stop. Picking a different place drops the old place's autocomplete data. */
export function updateStop(stops, id, patch) {
  return stops.map((s) => {
    if (s.id !== id) return s;
    const placeChanged = "place" in patch && patch.place !== s.place;
    const base = placeChanged && !("countryCode" in patch) ? { id: s.id, place: s.place, nights: s.nights, ...(s.travelMode ? { travelMode: s.travelMode } : {}) } : s;
    return { ...base, ...patch };
  });
}

/* ---------------------------------- saving ---------------------------------- */

/**
 * The route fields to merge into a trip document on create/update. Always writes every field
 * (even empty ones) so an update can clear a previous value. `destination` and `duration`
 * stay filled in for the older screens that still read them.
 */
export function routeToTripFields({ stops, endingAt = "", oneWay = false }) {
  const clean = sanitizeStops(stops);
  return {
    stops: clean,
    destination: clean[0]?.place ?? "",
    duration: totalDays(clean),
    endingAt: oneWay ? "" : cleanText(endingAt, 120),
    oneWay: Boolean(oneWay),
  };
}

/* --------------------------------- display --------------------------------- */

/** "Mumbai → Goa → Chennai". `max` shortens long routes: "Mumbai → Goa → +2". */
export function routeLabel(trip, { max = Infinity } = {}) {
  const names = getStops(trip).map((s) => shortPlace(s.place));
  if (names.length <= max) return names.join(" → ");
  return [...names.slice(0, Math.max(max - 1, 1)), `+${names.length - Math.max(max - 1, 1)}`].join(" → ");
}

/** What a compact card needs: the first place, how many more, and a badge. */
export function routeSummary(trip) {
  const stops = getStops(trip);
  const countries = tripCountries(stops);
  return {
    count: stops.length,
    first: stops[0] ? shortPlace(stops[0].place) : "",
    more: Math.max(stops.length - 1, 0),
    countries: countries.length,
    badge: stops.length > 1 ? `${stops.length} cities${countries.length > 1 ? ` · ${countries.length} countries` : ""}` : "",
  };
}

/** One Google Maps link that draws the whole route, waypoints included. */
export function mapsRouteUrl(trip) {
  const stops = getStops(trip);
  if (stops.length === 0) return "";
  const origin = cleanText(trip?.startingFrom, 120);
  const end = tripEndpoint(trip);
  const places = stops.map((s) => s.place);

  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  if (origin) url.searchParams.set("origin", origin);
  const destination = end ?? places[places.length - 1];
  const waypoints = end ? places : places.slice(0, -1);
  url.searchParams.set("destination", destination);
  if (waypoints.length > 0) url.searchParams.set("waypoints", waypoints.join("|"));
  return url.toString();
}

/* ------------------------------ stale itinerary ------------------------------ */

function hash(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * A short fingerprint of everything about the route that shapes an itinerary (cities, order,
 * nights, modes, start, end, dates). Saved with a generated itinerary; if it later differs
 * from the trip's current fingerprint, the itinerary is out of date.
 */
export function routeSignature(trip) {
  const stops = getStops(trip);
  const parts = [
    cleanText(trip?.startingFrom, 120).toLowerCase(),
    (tripEndpoint(trip) ?? "-").toLowerCase(),
    ISO_DATE.test(trip?.startDate ?? "") ? trip.startDate : "",
    ...stops.map((s) => `${s.place.toLowerCase()}~${s.nights}~${s.travelMode ?? ""}`),
  ];
  return hash(parts.join("|"));
}

/**
 * True only when we KNOW the plan no longer matches the route. An itinerary saved before this
 * feature has no signature, so it is never flagged (we can't tell, and old trips can't be edited).
 */
export function isItineraryStale(trip) {
  const saved = trip?.itinerary?.routeSignature;
  return typeof saved === "string" && saved !== routeSignature(trip);
}
