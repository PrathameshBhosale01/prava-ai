import { NextResponse } from "next/server";

import { BillingError, createCheckout } from "@/lib/billing/polar";
import { adminDb } from "@/lib/firebaseAdmin";
import { resolvePlan } from "@/lib/plans";
import { verifyIdToken } from "@/lib/serverAuth";
import { ZoneError } from "@/lib/zone/errors";
import { consumeRateLimit } from "@/lib/zone/rateLimit";

const RATE_RULES = { checkout: { limit: 10, windowMs: 60 * 60 * 1000 } };
const json = (body, status, headers) => NextResponse.json(body, { status, headers });

/**
 * POST /api/billing/checkout   body: { interval: "month" | "year" }
 * Auth: Authorization: Bearer <Firebase ID token>
 * Response: { url }: the browser should go to this Polar checkout page.
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

    const body = await request.json().catch(() => null);

    // Already Pro? Send them to manage the plan instead of paying twice.
    const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
    const current = userSnap.exists ? userSnap.data()?.subscription : null;
    if (resolvePlan({ subscription: current }) === "pro" && current?.status !== "canceled") {
      return json({ error: "You're already on Pro. Manage your plan from the subscription page.", code: "ALREADY_PRO" }, 409);
    }

    await consumeRateLimit({ db: adminDb, uid: decoded.uid, action: "checkout", rules: RATE_RULES });

    const checkout = await createCheckout({
      uid: decoded.uid,
      email: decoded.email,
      interval: body?.interval,
      origin: request.nextUrl.origin,
    });
    return json({ url: checkout.url }, 200);
  } catch (error) {
    if (error instanceof BillingError) return json({ error: error.message }, error.status);
    if (error instanceof ZoneError && error.status === 429) {
      return json({ error: error.message }, 429, { "Retry-After": String(error.retryAfter ?? 60) });
    }
    console.error("Checkout failed:", error);
    return json({ error: "Couldn't start checkout. Please try again." }, 500);
  }
}
