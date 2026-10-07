// Pure helpers behind the profile's stats and AI usage cards.

function normalizeDestination(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function hasItinerary(trip) {
  const itinerary = trip?.itinerary;
  if (!itinerary) return false;
  if (Array.isArray(itinerary)) return itinerary.length > 0;
  if (typeof itinerary === "object") return Object.keys(itinerary).length > 0;
  return true;
}

/** { trips, itineraries, destinations } from a list of the user's trips. */
export function computeTripStats(trips) {
  const list = Array.isArray(trips) ? trips : [];

  const destinations = new Set(
    list.map((trip) => normalizeDestination(trip?.destination)).filter(Boolean)
  );

  return {
    trips: list.length,
    itineraries: list.filter(hasItinerary).length,
    destinations: destinations.size,
  };
}

/**
 * Color for a usage bar: "danger" when the limit is used up, "warning" when
 * it's nearly gone (one left, or 80% used), otherwise "primary".
 */
export function getMeterTone({ used, limit }) {
  if (!(limit > 0)) return "primary";
  if (used >= limit) return "danger";
  if (limit - used <= 1 || used / limit >= 0.8) return "warning";
  return "primary";
}

/** Share of the limit used, 0-100, safe for a progress bar width. */
export function getMeterPercent({ used, limit }) {
  if (!(limit > 0)) return 0;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}