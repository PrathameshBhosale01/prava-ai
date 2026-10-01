import { NextResponse } from "next/server";

import { geocodeDestination } from "@/lib/weather";
import { fallbackCurrency, fetchRate, suggestCurrency } from "@/lib/currency";

const CODE = /^[A-Z]{3}$/;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const from = searchParams.get("from")?.toUpperCase() || "";
    let to = searchParams.get("to")?.toUpperCase() || "";
    const destination = searchParams.get("destination")?.trim() || "";

    // --------------------------------
    // 1. Validate
    // --------------------------------

    if (!CODE.test(from)) {
      return NextResponse.json({ error: "Invalid from currency" }, { status: 400 });
    }

    if (to && !CODE.test(to)) {
      return NextResponse.json({ error: "Invalid to currency" }, { status: 400 });
    }

    if (!to && (!destination || destination.length > 100)) {
      return NextResponse.json({ error: "Invalid destination" }, { status: 400 });
    }

    // --------------------------------
    // 2. No target chosen → guess from destination
    // --------------------------------

    const suggested = !to;

    if (suggested) {
      const place = await geocodeDestination(destination).catch(() => null);
      to = suggestCurrency(place?.countryCode, from);
    }

    // --------------------------------
    // 3. Get the rate
    // --------------------------------

    let rate;

    try {
      rate = await fetchRate(from, to);
    } catch (error) {
      // Our guess isn't supported by the API → fall back quietly
      if (suggested && (error.status === 404 || error.status === 422)) {
        to = fallbackCurrency(from);
        rate = await fetchRate(from, to);
      } else {
        throw error;
      }
    }

    return NextResponse.json(
      { from, to, rate, suggested },
      {
        headers: {
          // Rates change ~once a day, so 1 hour of caching is fine
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (error) {
    console.error("Currency fetch failed:", error);

    if (error.status === 404 || error.status === 422) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to fetch rate" }, { status: 502 });
  }
}