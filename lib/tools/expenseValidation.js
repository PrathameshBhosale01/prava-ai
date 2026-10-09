import { CURRENCIES } from "../currencyOptions.js";
import { currencyDigits, parseAmount } from "./currency.js";

// Pure validation for expenses and buckets. Used by the API (the real gate) and
// available to the UI for instant feedback. No imports from React or Firebase.

export const LIMITS = {
  titleMax: 80,
  noteMax: 200,
  bucketMax: 30, // characters in a bucket name
  bucketsPerUser: 30,
  amountMax: 1e9,
  listMax: 500, // most expenses returned per request
};

export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const CURRENCY_CODES = new Set(CURRENCIES.map((currency) => currency.code));
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2000-01-01";

export const todayIso = (now = new Date()) => now.toISOString().slice(0, 10);

/** The viewer's LOCAL calendar date as YYYY-MM-DD (what "today" means to them). */
export const localIsoDate = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "2026-02-30" is not a real date even though it matches the pattern. */
export function isRealDate(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const cleanText = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : null);

function readAmount(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") return parseAmount(raw).value;
  return null;
}

function optionalId(raw, label, errors, key) {
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !ID_PATTERN.test(raw)) {
    errors[key] = `Invalid ${label}.`;
    return null;
  }
  return raw;
}

/**
 * Validate a full expense. Returns { value, errors }; `errors` is { field: message }
 * and is empty when valid. Unknown fields are ignored, never stored.
 * `today` (YYYY-MM-DD) is injectable for tests; dates up to 2 days ahead are allowed
 * so a traveler east of UTC can log "today".
 */
export function validateExpenseInput(input, { today = todayIso() } = {}) {
  const errors = {};
  const source = input && typeof input === "object" ? input : {};

  const title = cleanText(source.title);
  if (!title) errors.title = "Enter what you spent on.";
  else if (title.length > LIMITS.titleMax) errors.title = `Keep it under ${LIMITS.titleMax} characters.`;

  const currency = typeof source.currency === "string" ? source.currency.toUpperCase() : "";
  if (!CURRENCY_CODES.has(currency)) errors.currency = "Choose a supported currency.";

  let amount = readAmount(source.amount);
  if (amount === null || amount <= 0) {
    errors.amount = "Enter an amount greater than zero.";
    amount = null;
  } else if (amount > LIMITS.amountMax) {
    errors.amount = "That amount is too large.";
    amount = null;
  } else if (!errors.currency) {
    const factor = 10 ** currencyDigits(currency);
    amount = Math.round(amount * factor) / factor;
    if (amount <= 0) {
      errors.amount = "That amount is too small.";
      amount = null;
    }
  }

  let date = source.date;
  if (date === undefined || date === null || date === "") date = today;
  if (!isRealDate(date)) errors.date = "Enter a valid date.";
  else if (date < MIN_DATE || date > addDays(today, 2)) errors.date = "Date is out of range.";

  let note = "";
  if (source.note !== undefined && source.note !== null) {
    const cleaned = cleanText(source.note);
    if (cleaned === null) errors.note = "Note must be text.";
    else if (cleaned.length > LIMITS.noteMax) errors.note = `Keep it under ${LIMITS.noteMax} characters.`;
    else note = cleaned;
  }

  const bucketId = optionalId(source.bucketId, "bucket", errors, "bucketId");
  const tripId = optionalId(source.tripId, "trip", errors, "tripId");

  return {
    value: { title, amount, currency, date, note, bucketId, tripId },
    errors,
  };
}

/** Validate a bucket name. Returns { value: title, error }. */
export function validateBucketTitle(raw) {
  const title = cleanText(raw);
  if (!title) return { value: null, error: "Enter a bucket name." };
  if (title.length > LIMITS.bucketMax) {
    return { value: null, error: `Keep it under ${LIMITS.bucketMax} characters.` };
  }
  return { value: title, error: null };
}
