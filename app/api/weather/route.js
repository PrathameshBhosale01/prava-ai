import { NextResponse } from "next/server";

import {
  addDays,
  fetchForecast,
  geocodeDestination,
  todayISO,
} from "@/lib/weather";

const MAX_DAYS_AHEAD = 14;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const destination = searchParams.get("destination")?.trim();
    const startDate = searchParams.get("startDate") || "";
    const duration = Number(searchParams.get("duration"));

    // --------------------------------
    // 1. Validate input
    // --------------------------------

    if (!destination || destination.length > 100) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      Number.isNaN(Date.parse(startDate))
    ) {
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 60) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    // --------------------------------
    // 2. Which trip days can we forecast?
    // --------------------------------

    const today = todayISO();
    const horizon = addDays(today, MAX_DAYS_AHEAD);
    const tripEnd = addDays(startDate, duration - 1);

    if (tripEnd < today) {
      return NextResponse.json({ available: false, reason: "past" });
    }

    if (startDate > horizon) {
      return NextResponse.json({
        available: false,
        reason: "too_far",
        availableFrom: addDays(startDate, -MAX_DAYS_AHEAD),
      });
    }

    const from = startDate < today ? today : startDate;
    const to = tripEnd > horizon ? horizon : tripEnd;
    const partial = from > startDate || to < tripEnd;

    // --------------------------------
    // 3. Geocode
    // --------------------------------

    const place = await geocodeDestination(destination);

    if (!place) {
      return NextResponse.json({ available: false, reason: "not_found" });
    }

    // --------------------------------
    // 4. Forecast
    // --------------------------------

    const days = await fetchForecast({
      latitude: place.latitude,
      longitude: place.longitude,
      startDate: from,
      endDate: to,
    });

    return NextResponse.json(
      {
        available: true,
        partial,
        location: { name: place.name, country: place.country },
        days,
      },
      {
        headers: {
          // Cache for 30 min on the CDN (works on Vercel)
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    console.error("Weather fetch failed:", error);

    return NextResponse.json(
      { error: "Failed to fetch weather" },
      { status: 502 }
    );
  }
}