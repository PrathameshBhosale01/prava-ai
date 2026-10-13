import { formatDateRange } from "./tripDetails.js";
import { buildLegs, buildSchedule, getStops, isInternational, tripCountries, tripEndpoint } from "./trips/stops.js";

export function buildItineraryPrompt(trip) {
  if (getStops(trip).length > 1) return buildMultiStopPrompt(trip);

  return `
You are an expert travel planner.

Create a personalized travel itinerary using the following trip information.

Trip title:
${trip.title}

Destination:
${trip.destination}

Starting location:
${trip.startingFrom}

Category:
${trip.category}

Description:
${trip.description || "No additional description provided."}

Budget:
${trip.currency} ${trip.budget}

Duration:
${trip.duration} days

Travelers:
${trip.travelers}

Start date:
${trip.startDate}

Interests:
${trip.interests?.join(", ") || "General sightseeing"}

Accommodation:
${trip.accommodation}

Transportation:
${trip.transportation}

Requirements:

1. Create a day-by-day itinerary.
2. Respect the trip duration.
3. Consider the user's interests.
4. Consider the stated transportation preference.
5. Keep activities geographically reasonable where possible.
6. Include realistic times.
7. Include breakfast, lunch, and dinner suggestions where appropriate.
8. Avoid impossible schedules.
9. Do not invent precise real-time availability or reservations.
10. Suggest only real, well-known places. If you are not sure a specific hotel or venue exists, describe a type of place instead (for example "Mid-range business hotel near the main station") rather than inventing a name.
11. Suggest 3 accommodation options that match the accommodation preference.
12. Every money value must be a plain number in ${trip.currency} (no symbols, no ranges). Prices are approximate.
13. "budgetBreakdown" is the estimated total cost of the WHOLE trip for ALL ${trip.travelers} traveler(s), and should stay within the stated budget when that is realistic.
14. "rating" values are approximate guest ratings out of 5. Leave a rating out if you are unsure.
15. Make "packingSuggestions" and "bestSeason" fit the destination at the trip's start date.
16. Return ONLY valid JSON matching the requested schema.

JSON schema:

{
  "summary": "string",
  "accommodations": [
    {
      "name": "string",
      "rating": 4.5,
      "address": "string",
      "description": "string",
      "pricePerNight": 12000
    }
  ],
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "string",
      "activities": [
        {
          "time": "HH:MM",
          "title": "string",
          "description": "string",
          "location": "string",
          "rating": 4.5,
          "price": "Free, or text such as 'about 2,500 per person'",
          "duration": "string, e.g. 2 hours",
          "bestTime": "string, e.g. Morning",
          "travel": "string, e.g. 15 minutes by metro"
        }
      ]
    }
  ],
  "budgetBreakdown": {
    "accommodation": 0,
    "food": 0,
    "transportation": 0,
    "activities": 0,
    "miscellaneous": 0
  },
  "localCuisine": ["5-8 dishes, each with a short description"],
  "safetyTips": ["4-6 practical tips"],
  "packingSuggestions": ["5-8 items"],
  "transportationTips": "string",
  "bestSeason": "string"
}
`;
}

/* ------------------------- multi-destination trips ------------------------- */

const range = (a, b) => (a === b ? `day ${a}` : `days ${a}-${b}`);
const withDates = (from, to) => {
  const dates = formatDateRange(from, to);
  return dates ? ` (${dates})` : "";
};

/** The fixed route, written out for the model: who is where on which day, and every journey. */
function describeRoute(trip) {
  const schedule = buildSchedule(trip);
  const legs = buildLegs(trip);
  const end = tripEndpoint(trip);
  const lastDay = schedule.totalDays;

  const stopLines = schedule.stops.map((stop, i) => {
    const country = stop.country ? `, ${stop.country}` : "";
    const hotel = stop.nights > 0 ? `${stop.nights} night${stop.nights === 1 ? "" : "s"}, check-in ${stop.checkIn || "on its first day"}, check-out ${stop.checkOut || "on its last day"}` : "no overnight stay";
    return `Stop ${i + 1}: ${stop.place}${stop.country && !stop.place.includes(stop.country) ? country : ""}: ${range(stop.firstDay, stop.lastDay)}${withDates(stop.checkIn, i === schedule.stops.length - 1 ? stop.checkOut : addOneBack(stop.checkOut))}, ${hotel}`;
  });

  const legLines = legs.map((leg, i) => `Journey ${i + 1}: ${leg.from} to ${leg.to}, on day ${leg.day}${leg.date ? ` (${leg.date})` : ""}, by ${leg.mode}`);

  const ending = end
    ? end.toLowerCase() === String(trip.startingFrom ?? "").trim().toLowerCase()
      ? `The trip ends with the journey back home to ${end} on day ${lastDay}.`
      : `The trip ends in ${end} on day ${lastDay} (a different city from the start).`
    : `The trip is one-way: it ends in ${schedule.stops[schedule.stops.length - 1].place} on day ${lastDay} with no return journey.`;

  return { stopLines, legLines, ending, totalDays: lastDay, legCount: legs.length };
}

// A stop's last full day is the day before it checks out.
function addOneBack(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? "")) return "";
  return new Date(Date.parse(`${iso}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

function buildMultiStopPrompt(trip) {
  const route = describeRoute(trip);
  const stops = getStops(trip);
  const international = isInternational(stops);
  const countries = tripCountries(stops);

  return `
You are an expert travel planner.

Create ONE connected, personalized itinerary for a multi-destination trip, using the following information.

Trip title:
${trip.title}

Starting location:
${trip.startingFrom}

Category:
${trip.category}

Description:
${trip.description || "No additional description provided."}

Budget (whole trip, all travelers):
${trip.currency} ${trip.budget}

Travelers:
${trip.travelers}

Start date:
${trip.startDate}

Interests:
${trip.interests?.join(", ") || "General sightseeing"}

Accommodation:
${trip.accommodation}

Default transportation:
${trip.transportation}

ROUTE (fixed by the app. Do not change the order, the cities, the number of days or the dates):
${route.stopLines.join("\n")}
${route.ending}

JOURNEYS (${route.legCount}):
${route.legLines.join("\n")}

Total length: ${route.totalDays} days.
${international ? `This trip crosses borders (${countries.join(", ")}).\n` : ""}
Requirements:

1. "days" must contain exactly ${route.totalDays} entries, numbered 1 to ${route.totalDays}, in order. Each day belongs to the stop listed above for that day number. Every activity on a day must be in or near that day's city.
2. On a journey day, plan the travel itself (a realistic departure and arrival time for the mode and distance), then keep the rest of that day light. Do not schedule sightseeing that the journey makes impossible.
3. On the last day, plan check-out and the final journey (if any) before anything else.
4. Within a stop, keep activities geographically reasonable and avoid impossible schedules.
5. Consider the user's interests and include breakfast, lunch and dinner suggestions where appropriate.
6. Include realistic times. Do not invent precise real-time availability or reservations.
7. Suggest only real, well-known places. If you are not sure a specific hotel or venue exists, describe a type of place instead (for example "Mid-range business hotel near the main station") rather than inventing a name.
8. "transfers" must contain one entry per journey, with "leg" set to the journey number above. "price" is the approximate total for ALL ${trip.travelers} traveler(s).
9. "accommodations": for every stop that has nights, give 3 options matching the accommodation preference, with "stop" set to the stop number above and "pricePerNight" for that city.
10. "budgetByStop": one entry per stop with an approximate accommodation, food and activities cost for that stop, with "stop" set to the stop number.
11. Every money value must be a plain number in ${trip.currency} (no symbols, no ranges). Prices are approximate.
12. "budgetBreakdown" is the estimated total cost of the WHOLE trip for ALL ${trip.travelers} traveler(s), including every journey under "transportation", and should stay within the stated budget when that is realistic.
13. "rating" values are approximate guest ratings out of 5. Leave a rating out if you are unsure.
14. Make "packingSuggestions" and "bestSeason" fit all the destinations at the trip's dates.
${international ? "15. Because the trip crosses borders, mention in \"safetyTips\" or \"transportationTips\" the currency, entry or visa checks and local SIM or connectivity worth sorting out. Do not state specific visa rules as facts; tell the traveler to verify them with the official source.\n16. Return ONLY valid JSON matching the requested schema." : "15. Return ONLY valid JSON matching the requested schema."}

JSON schema:

{
  "summary": "string, covering the whole route",
  "transfers": [
    {
      "leg": 1,
      "mode": "string, e.g. Train",
      "duration": "string, e.g. 10 hours overnight",
      "price": 4500,
      "notes": "string, e.g. book early; departs from the main station"
    }
  ],
  "accommodations": [
    {
      "stop": 1,
      "name": "string",
      "rating": 4.5,
      "address": "string",
      "description": "string",
      "pricePerNight": 12000
    }
  ],
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "string",
      "activities": [
        {
          "time": "HH:MM",
          "title": "string",
          "description": "string",
          "location": "string, include the city",
          "rating": 4.5,
          "price": "Free, or text such as 'about 2,500 per person'",
          "duration": "string, e.g. 2 hours",
          "bestTime": "string, e.g. Morning",
          "travel": "string, e.g. 15 minutes by metro"
        }
      ]
    }
  ],
  "budgetByStop": [
    { "stop": 1, "accommodation": 0, "food": 0, "activities": 0 }
  ],
  "budgetBreakdown": {
    "accommodation": 0,
    "food": 0,
    "transportation": 0,
    "activities": 0,
    "miscellaneous": 0
  },
  "localCuisine": ["5-8 dishes across the route, each with a short description"],
  "safetyTips": ["4-6 practical tips"],
  "packingSuggestions": ["5-8 items"],
  "transportationTips": "string",
  "bestSeason": "string"
}
`;
}
