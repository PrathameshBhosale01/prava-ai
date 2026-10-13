import { NextResponse } from "next/server";

import { MAX_QUERY_CHARS, MIN_QUERY_CHARS, searchPlaces } from "@/lib/placeSearch";

// GET /api/places?q=goa → { places: [...] } for the route builder's autocomplete.
export async function GET(request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    if (q.length < MIN_QUERY_CHARS || q.length > MAX_QUERY_CHARS) {
      return NextResponse.json({ error: "Invalid search" }, { status: 400 });
    }

    const places = await searchPlaces(q);

    return NextResponse.json(
      { places },
      {
        headers: {
          // Places don't move. Cache each search for a day on the CDN.
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("Place search failed:", error);
    return NextResponse.json({ error: "Failed to search places" }, { status: 502 });
  }
}
