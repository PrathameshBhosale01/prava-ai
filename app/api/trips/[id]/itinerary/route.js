import { NextResponse } from "next/server";

import { ai } from "@/lib/gemini";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { buildItineraryPrompt } from "@/lib/itineraryPrompt";
import { verifyIdToken } from "@/lib/serverAuth";

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    // --------------------------------
    // 1. Get Authorization header
    // --------------------------------

    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const token = authorization.substring(7);

    // --------------------------------
    // 2. Verify Firebase ID token
    // --------------------------------

    const decodedToken =
      await verifyIdToken(token);

    const userId = decodedToken.uid;

    // --------------------------------
    // 3. Get trip
    // --------------------------------

    const tripDoc = await adminDb.collection("trips").doc(id).get();

    if (!tripDoc.exists) {
      return NextResponse.json(
        {
          error: "Trip not found",
        },
        {
          status: 404,
        }
      );
    }

    const trip = {
      id: tripDoc.id,
      ...tripDoc.data(),
    };

    // --------------------------------
    // 4. Verify ownership
    // --------------------------------

    if (trip.userId !== userId) {
      return NextResponse.json(
        {
          error: "Forbidden",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------
    // 5. Build AI prompt
    // --------------------------------

    const prompt =
      buildItineraryPrompt(trip);

    // --------------------------------
    // 6. Call Gemini
    // --------------------------------

   const MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.8-flash",
  "gemini-3.5-flash-lite", // fallback if the main one is overloaded
];

let response;
let lastError;

for (const model of MODELS) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      break;
    } catch (err) {
      lastError = err;
      const retryable = err.status === 503 || err.status === 429;
      if (!retryable) throw err;
      // 1s, 2s, 4s backoff
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  if (response) break;
}

if (!response) throw lastError;
    // --------------------------------
    // 7. Parse AI response
    // --------------------------------

    const text = response.text;

    const itinerary = JSON.parse(text);

    // --------------------------------
    // 8. Validate structure
    // --------------------------------

    if (
      !itinerary.summary ||
      !Array.isArray(itinerary.days)
    ) {
      throw new Error(
        "Invalid itinerary structure"
      );
    }

    // --------------------------------
    // 9. Save to Firestore
    // --------------------------------

    await adminDb.collection("trips").doc(id).update({
      itinerary,
      itineraryGeneratedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

        // Best-effort activity log: never fail the request because of it.
    try {
      await adminDb
        .collection("users")
        .doc(userId)
        .collection("activities")
        .add({
          action: "CREATE",
          entity: "ITINERARY",
          entityId: id,
          title: String(trip.title ?? "").slice(0, 120),
          createdAt: FieldValue.serverTimestamp(),
        });
    } catch (activityError) {
      console.error("Failed to log activity:", activityError);
    }

    // --------------------------------
    // 10. Return response
    // --------------------------------

    return NextResponse.json({
      itinerary,
    });
  } catch (error) {
    console.error(
      "Itinerary generation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to generate itinerary",
      },
      {
        status: 500,
      }
    );
  }
}