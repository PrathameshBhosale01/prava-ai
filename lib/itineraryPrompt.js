export function buildItineraryPrompt(trip) {
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
