import { NextResponse } from "next/server";

import { BillingError, createPortalSession } from "@/lib/billing/polar";
import { verifyIdToken } from "@/lib/serverAuth";

const json = (body, status) => NextResponse.json(body, { status });

/**
 * POST /api/billing/portal
 * Auth: Authorization: Bearer <Firebase ID token>
 * Response: { url }: Polar's customer portal (change card, cancel, invoices).
 */
export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Please sign in first." }, 401);

    let decoded;
    try {
      decoded = await verifyIdToken(authorization.substring(7));
    } catch {
      return json({ error: "Your session has expired. Please sign in again." }, 401);
    }

    const session = await createPortalSession({ uid: decoded.uid, origin: request.nextUrl.origin });
    return json({ url: session.url }, 200);
  } catch (error) {
    if (error instanceof BillingError) return json({ error: error.message }, error.status);
    console.error("Portal session failed:", error);
    return json({ error: "Couldn't open the billing portal. Please try again." }, 500);
  }
}
