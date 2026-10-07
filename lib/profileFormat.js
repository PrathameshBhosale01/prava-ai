// Pure display helpers for the profile (no React, no Firebase).

function toDateOrNull(value) {
  let date = null;

  if (typeof value?.toDate === "function") date = value.toDate(); // Firestore Timestamp
  else if (typeof value === "string" || typeof value === "number") date = new Date(value);

  return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
}

/**
 * When the account was created. Prefers the Firestore profile; falls back to
 * the Firebase Auth creation time (e.g. while the profile is still loading).
 */
export function getMemberSinceDate(profile, user) {
  return toDateOrNull(profile?.createdAt) ?? toDateOrNull(user?.metadata?.creationTime);
}

/** "March 23, 2026" (in the viewer's locale). Empty string for no date. */
export function formatLongDate(date, locale) {
  if (!date) return "";
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}