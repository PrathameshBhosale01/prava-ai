import { NextResponse } from "next/server";
import { ai } from "@/lib/gemini";
import { getTrip } from "@/lib/tripService";
import { buildItineraryPrompt } from "@/lib/itineraryPrompt";

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    const trip = await getTrip(id);

    if (!trip) {
      return NextResponse.json(
        {
          error: "Trip not found",
        },
        {
          status: 404,
        }
      );
    }

    const prompt = buildItineraryPrompt(trip);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;

    const itinerary = JSON.parse(text);
        if (
    !itinerary.summary ||
    !Array.isArray(itinerary.days)
    ) {
    throw new Error(
        "AI returned an invalid itinerary structure"
    );
    }

    return NextResponse.json({
      itinerary,
    });
  } catch (error) {
    console.error(
      "Itinerary generation failed:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to generate itinerary",
      },
      {
        status: 500,
      }
    );
  }
}