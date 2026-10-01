import { NextResponse } from "next/server";

import { geocodeDestination } from "@/lib/weather";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const destination = searchParams.get("destination")?.trim();

    if (!destination || destination.length > 100) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    }

    const place = await geocodeDestination(destination);

    // Expected state, not an error: 200 with a reason.
    if (!place) {
      return NextResponse.json({ available: false, reason: "not_found" });
    }

    return NextResponse.json(
      {
        available: true,
        location: {
          name: place.name,
          country: place.country,
          latitude: place.latitude,
          longitude: place.longitude,
        },
      },
      {
        headers: {
          // Places don't move. Cache for a day on the CDN.
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("Geocode failed:", error);
    return NextResponse.json({ error: "Failed to look up location" }, { status: 502 });
  }
}