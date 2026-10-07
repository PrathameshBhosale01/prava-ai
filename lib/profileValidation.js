import { TRAVEL_INTERESTS } from "./travelInterests.js";

// Pure helpers (no Firebase imports) so the UI and the save functions
// apply exactly the same rules.

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 40;

/** Trim and collapse inner whitespace: "  Ramu   Kadam " -> "Ramu Kadam". */
export function normalizeDisplayName(raw) {
  return String(raw ?? "").trim().replace(/\s+/g, " ");
}

/** Returns an error message, or null when the name is acceptable. */
export function getDisplayNameError(raw) {
  const name = normalizeDisplayName(raw);

  if (name.length < DISPLAY_NAME_MIN || name.length > DISPLAY_NAME_MAX) {
    return `Name must be between ${DISPLAY_NAME_MIN} and ${DISPLAY_NAME_MAX} characters.`;
  }
  return null;
}

/** Keep only known interests, drop duplicates, preserve the given order. */
export function sanitizePreferences(values) {
  if (!Array.isArray(values)) return [];

  const allowed = new Set(TRAVEL_INTERESTS);
  return [...new Set(values)].filter((value) => allowed.has(value));
}