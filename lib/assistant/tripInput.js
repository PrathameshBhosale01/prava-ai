import {
  DEFAULT_START_OFFSET_DAYS,
  MAX_TRAVELERS,
  MAX_TRIP_DAYS,
  TRIP_OPTIONS,
  USAGE_TIMEZONE,
} from "./config.js";
import { addDaysToKey, dateKey, isValidDateKey } from "./dates.js";

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

  const destination = cleanText(input.destination, 120);
  if (!destination) return fail("I still need a destination for this trip. Where would you like to go?");

  const startingFrom = cleanText(input.startingFrom ?? input.source, 120);
  if (!startingFrom) return fail("Where will you be starting your journey from?");

  const duration = toInt(input.duration ?? input.days);
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
  const title =
    cleanText(input.title, 80) || `${duration}-Day ${shortDestination} Trip`;

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
    },
  };
}