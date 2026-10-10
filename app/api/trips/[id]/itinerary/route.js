import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { generateItinerary } from "@/lib/assistant/gemini";
import { ItineraryFormatError } from "@/lib/assistant/itinerary";
import { adminDb } from "@/lib/firebaseAdmin";
import { ai } from "@/lib/gemini";
import { verifyIdToken } from "@/lib/serverAuth";
import { ZoneError } from "@/lib/zone/errors";
import { consumeRateLimit } from "@/lib/zone/rateLimit";

// The richer itinerary (hotels, budget, tips) is a bigger response, so allow the model more time.
export const maxDuration = 60;

// Each generation is a paid Gemini call, so cap how many one account can trigger.
const RATE_RULES = { itinerary: { limit: 10, windowMs: 60 * 60 * 1000 } };

const MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.8-flash",
  "gemini-3.5-flash-lite", // fallback if the main one is overloaded
];

const json = (body, status, headers) => NextResponse.json(body, { status, headers });

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    // 1. Who is asking?
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    let userId;
    try {
      userId = (await verifyIdToken(authorization.substring(7))).uid;
    } catch {
      return json({ error: "Unauthorized" }, 401); // expired / invalid token: not a server error
    }

    // 2. Is it their trip?
    const tripDoc = await adminDb.collection("trips").doc(id).get();
    if (!tripDoc.exists) return json({ error: "Trip not found" }, 404);
    const trip = { id: tripDoc.id, ...tripDoc.data() };
    if (trip.userId !== userId) return json({ error: "Forbidden" }, 403);

    // 3. Only real generations count against the limit.
    await consumeRateLimit({ db: adminDb, uid: userId, action: "itinerary", rules: RATE_RULES });

    // 4. Generate + validate. Retries, model fallback and shape-checking all live in
    //    generateItinerary, so what gets saved always matches what the page renders.
    const itinerary = await generateItinerary({ ai, models: MODELS, trip });

    // 5. Save.
    await adminDb.collection("trips").doc(id).update({
      itinerary,
      itineraryGeneratedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Best-effort activity log: never fail the request because of it.
    try {
      await adminDb.collection("users").doc(userId).collection("activities").add({
        action: "CREATE",
        entity: "ITINERARY",
        entityId: id,
        title: String(trip.title ?? "").slice(0, 120),
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (activityError) {
      console.error("Failed to log activity:", activityError);
    }

    return json({ itinerary }, 200);
  } catch (error) {
    if (error instanceof ZoneError && error.status === 429) {
      return json({ error: error.message }, 429, { "Retry-After": String(error.retryAfter ?? 60) });
    }
    if (error instanceof ItineraryFormatError) {
      console.error("Itinerary format error:", error);
      return json({ error: "The AI returned a plan we couldn't read. Please try again." }, 502);
    }
    console.error("Itinerary generation failed:", error);
    return json({ error: "Failed to generate itinerary" }, 500);
  }
}
