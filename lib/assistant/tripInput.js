import {
  DEFAULT_START_OFFSET_DAYS,
  MAX_TRAVELERS,
  MAX_TRIP_DAYS,
  TRIP_OPTIONS,
  USAGE_TIMEZONE,
} from "./config.js";
import { addDaysToKey, dateKey, isValidDateKey } from "./dates.js";
import { MAX_STOPS, routeToTripFields, shortPlace, validateRoute } from "../trips/stops.js";

function fail(error) {
  return { ok: false, error };
}

function cleanText(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function pickOption(value, options) {
  if (typeof value !== "string") return null;
  const wanted = value.trim().toLowerCase();
  return options.find((option) => option.toLowerCase() === wanted) ?? null;
}

/**
 * Reads the optional `stops` list (multi-city). Returns null when the model gave a single
 * destination, so one-city trips go through the original path unchanged.
 * Missing nights are filled by sharing the trip length evenly between the stops.
 */
function readStops(input, duration) {
  if (!Array.isArray(input.stops)) return null;
  const places = input.stops
    .slice(0, MAX_STOPS + 1) // one extra so validateRoute can report "too many"
    .map((item) => ({
      place: cleanText(typeof item === "string" ? item : item?.place, 120),
      nights: typeof item === "object" ? toInt(item?.nights) : null,
    }))
    .filter((item) => item.place);
  if (places.length < 2) return null;

  if (places.some((item) => !item.nights || item.nights < 1)) {
    if (!duration || duration < places.length + 1) return { missingNights: true };
    const total = duration - 1;
    const base = Math.floor(total / places.length);
    const extra = total % places.length;
    return places.map((item, index) => ({ place: item.place, nights: base + (index < extra ? 1 : 0) }));
  }
  return places;
}

/**
 * Validates the arguments the model passes to `create_trip_plan` and converts
 * them into the exact shape `createTrip()` stores in the `trips` collection.
 *
 * Never trust model output: every field is checked, clamped or defaulted here.
 * When something required is missing, `error` is a friendly sentence that can
 * be shown to the user as-is.
 *
 * @returns {{ ok: true, trip: object } | { ok: false, error: string }}
 */
export function normalizeTripInput(raw, { now = new Date() } = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  const today = dateKey(now, USAGE_TIMEZONE);

  const multi = readStops(input, toInt(input.duration ?? input.days));
  const destination = multi && !multi.missingNights ? multi[0].place : cleanText(input.destination, 120);
  if (!destination) return fail("I still need a destination for this trip. Where would you like to go?");

  const startingFrom = cleanText(input.startingFrom ?? input.source, 120);
  if (!startingFrom) return fail("Where will you be starting your journey from?");

  if (multi?.missingNights) {
    return fail(`How many nights would you like in each city? A trip can be up to ${MAX_TRIP_DAYS} days in total.`);
  }

  let route = null;
  if (multi) {
    const checked = validateRoute({ stops: multi, startingFrom });
    if (!checked.ok) return fail(`${checked.error} Could you adjust the plan?`);
    const oneWay = input.oneWay === true;
    route = routeToTripFields({ stops: checked.stops, endingAt: oneWay ? "" : cleanText(input.endingAt, 120), oneWay });
  }

  const duration = route ? route.duration : toInt(input.duration ?? input.days);
  if (!duration || duration < 1 || duration > MAX_TRIP_DAYS) {
    return fail(`I can plan trips of 1 to ${MAX_TRIP_DAYS} days at a time. How many days should this one be?`);
  }

  const budget = toNumber(input.budget);
  if (!budget || budget <= 0 || budget > 1_000_000_000) {
    return fail("What total budget should I plan around?");
  }

  const currency = pickOption(String(input.currency ?? "").toUpperCase(), TRIP_OPTIONS.currencies);
  if (!currency) {
    return fail(`Which currency is that budget in (${TRIP_OPTIONS.currencies.join(", ")})?`);
  }

  const travelers = toInt(input.travelers ?? input.persons);
  if (!travelers || travelers < 1 || travelers > MAX_TRAVELERS) {
    return fail("How many people are travelling?");
  }

  const startDate =
    isValidDateKey(input.startDate) && input.startDate >= today
      ? input.startDate
      : addDaysToKey(today, DEFAULT_START_OFFSET_DAYS);

  const interests = Array.isArray(input.interests)
    ? [...new Set(input.interests.map((item) => pickOption(item, TRIP_OPTIONS.interests)).filter(Boolean))]
    : [];

  const category =
    pickOption(input.category, TRIP_OPTIONS.categories) ?? (travelers === 1 ? "Solo" : "Leisure");

  const shortDestination = destination.split(",")[0].trim();
  const defaultTitle = route
    ? `${duration}-Day ${route.stops.map((s) => shortPlace(s.place)).slice(0, 3).join(" & ")}${route.stops.length > 3 ? " & More" : ""} Trip`
    : `${duration}-Day ${shortDestination} Trip`;
  const title = cleanText(input.title, 80) || defaultTitle;

  return {
    ok: true,
    trip: {
      title,
      category,
      description: cleanText(input.description, 500),
      destination,
      startingFrom,
      budget: Math.round(budget * 100) / 100,
      currency,
      duration,
      travelers,
      startDate,
      interests,
      accommodation: pickOption(input.accommodation, TRIP_OPTIONS.accommodations) ?? "Hotel",
      transportation: pickOption(input.transportation, TRIP_OPTIONS.transportations) ?? "Mixed",
      ...(route && { stops: route.stops, endingAt: route.endingAt, oneWay: route.oneWay }),
    },
  };
}