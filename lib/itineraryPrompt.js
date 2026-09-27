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
10. Return ONLY valid JSON matching the requested schema.

JSON schema:

{
  "summary": "string",
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
          "location": "string"
        }
      ]
    }
  ]
}
`;
}