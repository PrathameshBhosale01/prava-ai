import { NextResponse } from "next/server";

import { fetchRateTable } from "@/lib/currency";
import { CURRENCIES } from "@/lib/currencyOptions";

// Public, like /api/currency: exchange rates aren't user data. Cached at the
// edge so many users share one upstream request.
export async function GET() {
  try {
    const table = await fetchRateTable(CURRENCIES.map((currency) => currency.code));

    return NextResponse.json(table, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("GET /api/currency/rates failed:", error);
    return NextResponse.json(
      { error: "Couldn't load exchange rates right now." },
      { status: 502 }
    );
  }
}
