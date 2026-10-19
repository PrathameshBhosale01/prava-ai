import { NextResponse } from "next/server";

import { productIds } from "@/lib/billing/polar";
import { applySubscriptionEvent, verifyWebhook, WebhookError } from "@/lib/billing/webhook";
import { adminDb } from "@/lib/firebaseAdmin";

// Polar needs the exact bytes it signed, so read the body as text and never as JSON first.
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/webhook: called by Polar, not by the browser.
 *  - bad signature → 400 (Polar will not retry a forged call)
 *  - ignored events (other products, unknown users) → 200 so Polar stops retrying
 *  - our own failures → 500 so Polar retries later
 */
export async function POST(request) {
  const body = await request.text();

  let event;
  try {
    event = verifyWebhook({ body, headers: request.headers, secret: process.env.POLAR_WEBHOOK_SECRET });
  } catch (error) {
    if (error instanceof WebhookError) {
      console.warn("Rejected webhook:", error.message);
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }
    throw error;
  }

  try {
    const result = await applySubscriptionEvent({ db: adminDb, event, productIds: productIds() });
    if (!result.applied) console.info(`Webhook ${event.type} ignored: ${result.reason}`);
    return NextResponse.json({ received: true, applied: result.applied });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
