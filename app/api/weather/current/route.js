import { NextResponse } from "next/server";

import {
  fetchCurrentWeather,
  geocodeDestination,
  parseCoordinate,
  reverseGeocode,
} from "@/lib/weather";

// GET /api/weather/current?city=Mumbai
// GET /api/weather/current?lat=19.03&lon=73.11
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city")?.trim();

    let weatherPromise;
    let locationPromise;
    let cacheControl;

    if (city) {
      if (city.length > 100) {
        return NextResponse.json({ error: "Invalid city" }, { status: 400 });
      }

      const place = await geocodeDestination(city);
      if (!place) {
        return NextResponse.json({ error: "City not found" }, { status: 404 });
      }

      weatherPromise = fetchCurrentWeather(place);
      locationPromise = Promise.resolve({ name: place.name, country: place.country });
      // City weather is the same for everyone: safe to share on the CDN.
      cacheControl = "public, s-maxage=600, stale-while-revalidate=1800";
    } else {
      const lat = parseCoordinate(searchParams.get("lat"), -90, 90);
      const lon = parseCoordinate(searchParams.get("lon"), -180, 180);

      if (lat == null || lon == null) {
        return NextResponse.json(
          { error: "Provide a city, or valid lat and lon" },
          { status: 400 }
        );
      }

      // ~1 km precision is plenty for weather and avoids needless cache misses.
      const latitude = Number(lat.toFixed(2));
      const longitude = Number(lon.toFixed(2));

      weatherPromise = fetchCurrentWeather({ latitude, longitude });
      locationPromise = reverseGeocode(latitude, longitude).then(
        (found) => found ?? { name: "Current location", country: null }
      );
      // Derived from the user's position: browser cache only, never shared.
      cacheControl = "private, max-age=300";
    }

    const [weather, location] = await Promise.all([weatherPromise, locationPromise]);

    return NextResponse.json(
      { location, ...weather },
      { headers: { "Cache-Control": cacheControl } }
    );
  } catch (error) {
    console.error("Current weather failed:", error);
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 502 });
  }
}