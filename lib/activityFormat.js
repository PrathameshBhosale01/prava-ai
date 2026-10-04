// Pure helpers for displaying activity entries (no React, easy to test).

const ACTION_LABELS = { CREATE: "Created", UPDATE: "Updated", DELETE: "Deleted" };
const ENTITY_NOUNS = { TRIP: "trip", ITINERARY: "itinerary" };

/** "Created a trip", "Generated an itinerary", ... */
export function formatActivity({ action, entity }) {
  if (entity === "ITINERARY" && action === "CREATE") return "Generated an itinerary";

  const verb = ACTION_LABELS[action];
  const noun = ENTITY_NOUNS[entity];
  return verb && noun ? `${verb} a ${noun}` : "Account activity";
}

/** Which semantic color the icon tile should use. */
export function getActivityTone(action) {
  if (action === "CREATE") return "success";
  if (action === "UPDATE") return "info";
  if (action === "DELETE") return "danger";
  return "neutral";
}

/** Firestore Timestamp -> Date. Null while a server timestamp is still pending. */
export function toDate(createdAt) {
  return typeof createdAt?.toDate === "function" ? createdAt.toDate() : null;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "Just now", "5 minutes ago", "yesterday", "3 weeks ago"... `now` is a ms timestamp. */
export function formatRelativeTime(date, now) {
  const seconds = Math.round((date.getTime() - now) / 1000);

  // Under a minute, including small clock differences into the future.
  if (seconds > -60) return "Just now";

  const minutes = Math.round(seconds / 60);
  if (minutes > -60) return rtf.format(minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (hours > -24) return rtf.format(hours, "hour");

  const days = Math.round(hours / 24);
  if (days > -30) return rtf.format(days, "day");

  const months = Math.round(days / 30);
  if (months > -12) return rtf.format(months, "month");

  return rtf.format(Math.round(months / 12), "year");
}