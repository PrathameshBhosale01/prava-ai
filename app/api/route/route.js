import { NextResponse } from "next/server";

// Base URL lives in env so you can point at your own OSRM server later.
// The public demo server is best-effort, non-commercial, ~1 request/second,
// and ALWAYS routes as "driving" whatever profile you ask for.
const OSRM_BASE_URL = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

// OSRM asks for a User-Agent that identifies your app.
const USER_AGENT = "prava-ai/0.1 (portfolio project)";

function readCoord(searchParams, key, limit) {
  const raw = searchParams.get(key);
  if (raw === null || raw.trim() === "") return null; // Number("") would be 0
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return null;
  return value;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const fromLat = readCoord(searchParams, "fromLat", 90);
    const fromLng = readCoord(searchParams, "fromLng", 180);
    const toLat = readCoord(searchParams, "toLat", 90);
    const toLng = readCoord(searchParams, "toLng", 180);

    if ([fromLat, fromLng, toLat, toLng].some((v) => v === null)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    // OSRM wants longitude,latitude (the opposite of Leaflet's [lat, lng]).
    const url =
      `${OSRM_BASE_URL}/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=simplified&geometries=geojson`;

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok && res.status !== 400) {
      throw new Error(`OSRM responded ${res.status}`);
    }

    const data = await res.json().catch(() => null);

    // "NoRoute" / "NoSegment" (e.g. across an ocean) is an expected state,
    // so it's a 200 with a reason, not an error.
    if (!data || data.code !== "Ok" || !data.routes?.[0]) {
      return NextResponse.json({ available: false, reason: "no_route" });
    }

    const route = data.routes[0];

    return NextResponse.json(
      {
        available: true,
        // GeoJSON is [lng, lat]; flip to [lat, lng] for Leaflet.
        coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("Route fetch failed:", error);
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 502 });
  }
}