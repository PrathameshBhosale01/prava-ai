import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { releaseDayEdit, reserveDayEdit } from "@/lib/assistant/dayQuota";
import { generateDay } from "@/lib/assistant/gemini";
import { ItineraryFormatError } from "@/lib/assistant/itinerary";
import { adminDb } from "@/lib/firebaseAdmin";
import { ai } from "@/lib/gemini";
import { verifyIdToken } from "@/lib/serverAuth";
import { mergeDay, sanitizeInstruction } from "@/lib/trips/dayEdit";
import { ZoneError } from "@/lib/zone/errors";
import { consumeRateLimit } from "@/lib/zone/rateLimit";

export const maxDuration = 60;

const RATE_RULES = { itineraryDay: { limit: 30, windowMs: 60 * 60 * 1000 } };

const MODELS = [process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.5-flash-lite"];

const json = (body, status, headers) => NextResponse.json(body, { status, headers });

/** POST { day: number, instruction?: string } → { itinerary, usage } */
export async function POST(request, { params }) {
  try {
    const { id } = await params;

    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    let userId;
    try {
      userId = (await verifyIdToken(authorization.substring(7))).uid;
    } catch {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await request.json().catch(() => null);
    const dayNumber = Number(body?.day);
    if (!Number.isInteger(dayNumber) || dayNumber < 1) return json({ error: "Pick a day to change." }, 400);
    const instruction = sanitizeInstruction(body?.instruction);

    const tripRef = adminDb.collection("trips").doc(id);
    const tripDoc = await tripRef.get();
    if (!tripDoc.exists) return json({ error: "Trip not found" }, 404);
    const trip = { id: tripDoc.id, ...tripDoc.data() };
    if (trip.userId !== userId) return json({ error: "Forbidden" }, 403);

    const days = Array.isArray(trip.itinerary?.days) ? trip.itinerary.days : [];
    if (!days.some((d) => d.day === dayNumber)) {
      return json({ error: "That day isn't in this trip's plan. Generate the itinerary first." }, 404);
    }

    await consumeRateLimit({ db: adminDb, uid: userId, action: "itineraryDay", rules: RATE_RULES });

    const quota = await reserveDayEdit({ db: adminDb, uid: userId, instruction });
    if (!quota.ok) return json(quota.body, quota.status);

    let saved;
    try {
      const generated = await generateDay({ ai, models: MODELS, trip, itinerary: trip.itinerary, dayNumber, instruction });
      const newDay = generated.days.find((d) => d.day === dayNumber);

      // Re-read inside a transaction so a plan saved meanwhile (another tab) is never overwritten.
      saved = await adminDb.runTransaction(async (tx) => {
        const fresh = (await tx.get(tripRef)).data();
        const merged = mergeDay({ itinerary: fresh?.itinerary, dayNumber, rawDay: newDay });
        tx.update(tripRef, { itinerary: merged, updatedAt: FieldValue.serverTimestamp() });
        return merged;
      });
    } catch (error) {
      await releaseDayEdit({ db: adminDb, uid: userId, kind: quota.kind });
      throw error;
    }

    return json({ itinerary: saved, usage: quota.snapshot }, 200);
  } catch (error) {
    if (error instanceof ZoneError && error.status === 429) {
      return json({ error: error.message }, 429, { "Retry-After": String(error.retryAfter ?? 60) });
    }
    if (error instanceof ItineraryFormatError) {
      return json({ error: "The AI returned a day we couldn't read. Please try again." }, 502);
    }
    console.error("Day regeneration failed:", error);
    return json({ error: "Failed to update this day" }, 500);
  }
}
