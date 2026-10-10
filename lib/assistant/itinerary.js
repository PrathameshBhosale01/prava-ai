// Parsing + validation for the itinerary JSON returned by Gemini.
// The output is what the trip details page renders (components/trips/details/*):
//   {
//     summary,
//     days: [{ day, date, title, activities: [{ time, title, description, location,
//                                               rating?, price?, duration?, bestTime?, travel? }] }],
//     // everything below is OPTIONAL and only present when the model supplied usable data
//     accommodations?, budgetBreakdown?, localCuisine?, safetyTips?, packingSuggestions?,
//     transportationTips?, bestSeason?
//   }
// Optional fields are added only when valid, so older/plainer itineraries keep exactly
// their original shape (and normalizing twice gives the same result).

export class ItineraryFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = "ItineraryFormatError";
  }
}

function text(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Parses JSON, tolerating Markdown code fences and stray text around the object. */
export function parseJsonLoose(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new ItineraryFormatError("Empty model response");
  }

  const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(stripped);
  } catch {
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new ItineraryFormatError("Model response was not valid JSON");
  }
}

export const BUDGET_KEYS = ["accommodation", "food", "transportation", "activities", "miscellaneous"];

// Models don't always use our exact key names.
const BUDGET_ALIASES = {
  accommodation: "accommodation", hotel: "accommodation", hotels: "accommodation", stay: "accommodation", lodging: "accommodation",
  food: "food", dining: "food", meals: "food",
  transportation: "transportation", transport: "transportation", travel: "transportation",
  activities: "activities", attractions: "activities", sightseeing: "activities",
  miscellaneous: "miscellaneous", misc: "miscellaneous", other: "miscellaneous", others: "miscellaneous",
};

const NUMBER_TOKEN = /\d[\d,]*(?:\.\d+)?/;

/** 18500 · "₹18,500 per night" · "2500-4000" (→ first number) → whole non-negative number, else null. */
function amount(value) {
  let n = value;
  if (typeof value === "string") {
    const match = value.match(NUMBER_TOKEN);
    n = match ? Number(match[0].replace(/,/g, "")) : NaN;
  }
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** 4.5 · "4.5 stars" → 0–5 with one decimal, else null (so "9.8/10" or junk is dropped, never shown wrong). */
function rating(value) {
  let n = value;
  if (typeof value === "string") {
    const match = value.match(NUMBER_TOKEN);
    n = match ? Number(match[0].replace(/,/g, "")) : NaN;
  }
  return typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 5 ? Math.round(n * 10) / 10 : null;
}

/** Trimmed, de-duplicated (case-insensitive) strings only; objects/numbers are dropped. */
function stringList(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    const line = text(item, maxLength);
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length === maxItems) break;
  }
  return out;
}

const withValue = (object) => Object.fromEntries(Object.entries(object).filter(([, v]) => v !== null && v !== ""));

function normalizeAccommodations(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((hotel) => ({
      name: text(hotel?.name, 100),
      ...withValue({
        rating: rating(hotel?.rating),
        address: text(hotel?.address, 160),
        description: text(hotel?.description, 500),
        pricePerNight: amount(hotel?.pricePerNight),
      }),
    }))
    .filter((hotel) => hotel.name)
    .slice(0, 6);
}

function normalizeBudget(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const key = BUDGET_ALIASES[String(rawKey).trim().toLowerCase()];
    const n = amount(rawValue);
    if (key && n !== null) out[key] = (out[key] ?? 0) + n; // two aliases for one bucket are summed, not dropped
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Coerces model output into the exact itinerary shape, dropping anything malformed. */
export function normalizeItinerary(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.days)) {
    throw new ItineraryFormatError("Invalid itinerary structure");
  }

  const days = value.days
    .map((day, index) => {
      const activities = (Array.isArray(day?.activities) ? day.activities : [])
        .map((activity) => ({
          time: text(activity?.time, 12),
          title: text(activity?.title, 120),
          description: text(activity?.description, 400),
          location: text(activity?.location, 120),
          ...withValue({
            rating: rating(activity?.rating),
            price: text(activity?.price, 80),
            duration: text(activity?.duration, 40),
            bestTime: text(activity?.bestTime, 60),
            travel: text(activity?.travel, 80),
          }),
        }))
        .filter((activity) => activity.title);

      const number = Number.parseInt(day?.day, 10);
      const dayNumber = Number.isFinite(number) && number > 0 ? number : index + 1;

      return {
        day: dayNumber,
        date: /^\d{4}-\d{2}-\d{2}$/.test(day?.date ?? "") ? day.date : "",
        title: text(day?.title, 100) || `Day ${dayNumber}`,
        activities,
      };
    })
    .filter((day) => day.activities.length > 0);

  if (days.length === 0) throw new ItineraryFormatError("Itinerary has no usable days");

  const accommodations = normalizeAccommodations(value.accommodations);
  const budgetBreakdown = normalizeBudget(value.budgetBreakdown);
  const localCuisine = stringList(value.localCuisine, 10, 220);
  const safetyTips = stringList(value.safetyTips, 10, 260);
  const packingSuggestions = stringList(value.packingSuggestions, 12, 120);

  return {
    summary: text(value.summary, 700) || `A ${days.length}-day plan.`,
    days,
    ...(accommodations.length > 0 && { accommodations }),
    ...(budgetBreakdown && { budgetBreakdown }),
    ...(localCuisine.length > 0 && { localCuisine }),
    ...(safetyTips.length > 0 && { safetyTips }),
    ...(packingSuggestions.length > 0 && { packingSuggestions }),
    ...(text(value.transportationTips, 700) && { transportationTips: text(value.transportationTips, 700) }),
    ...(text(value.bestSeason, 700) && { bestSeason: text(value.bestSeason, 700) }),
  };
}