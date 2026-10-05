// Small date helpers that work with "YYYY-MM-DD" keys so we never depend on
// the server's local timezone.

/** Returns the calendar date ("YYYY-MM-DD") of `date` in the given IANA timezone. */
export function dateKey(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** True when `key` is a real calendar date written as YYYY-MM-DD. */
export function isValidDateKey(key) {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const parsed = new Date(`${key}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(key);
}

/** Adds `days` to a YYYY-MM-DD key and returns a new key. */
export function addDaysToKey(key, days) {
  const parsed = new Date(`${key}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}