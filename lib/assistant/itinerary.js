// Parsing + validation for the itinerary JSON returned by Gemini.
// The output must match what app/(dashboard)/trips/[id]/page.js renders:
//   { summary, days: [{ day, date, title, activities: [{ time, title, description, location }] }] }

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

  return {
    summary: text(value.summary, 700) || `A ${days.length}-day plan.`,
    days,
  };
}