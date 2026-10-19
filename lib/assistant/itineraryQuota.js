// Plan + credit checks for "generate / regenerate this trip's itinerary" (app/api/trips/[id]/itinerary).
// Kept out of the route so it can be tested without Firebase or Next.js.

import { checkRegenerate, creditCost } from "../plans.js";
import { creditLimitMessage, getUsageSnapshot, refundUsage, reserveUsage } from "./usage.js";

/** True when the trip already has a saved plan (so generating again is a "regenerate"). */
export function hasSavedItinerary(trip) {
  const itinerary = trip?.itinerary;
  if (!itinerary) return false;
  if (Array.isArray(itinerary)) return itinerary.length > 0;
  return typeof itinerary === "object" ? Object.keys(itinerary).length > 0 : true;
}

/**
 * Call BEFORE generating. On success the credits are already reserved; call
 * `releaseItineraryGeneration` if the generation then fails.
 * @returns {Promise<{ ok: true, regenerate: boolean, snapshot: object } | { ok: false, status: number, body: object }>}
 */
export async function reserveItineraryGeneration({ db, uid, trip, now = new Date() }) {
  const current = await getUsageSnapshot({ db, uid, now });
  const regenerate = hasSavedItinerary(trip);

  if (regenerate) {
    const allowed = checkRegenerate(current.plan, trip.itineraryRegenerations);
    if (!allowed.ok) {
      return { ok: false, status: 403, body: { error: allowed.message, code: allowed.code, upgrade: true, usage: current } };
    }
  }

  const reservation = await reserveUsage({ db, uid, kind: "plan", now });
  if (!reservation.allowed) {
    return {
      ok: false,
      status: 429,
      body: {
        error: creditLimitMessage(reservation.snapshot, creditCost("plan")),
        code: "LIMIT_REACHED",
        upgrade: reservation.snapshot.plan === "free",
        usage: reservation.snapshot,
      },
    };
  }
  return { ok: true, regenerate, snapshot: reservation.snapshot };
}

/** Gives the credits back after a failed generation. Never throws. */
export async function releaseItineraryGeneration({ db, uid, now = new Date() }) {
  try {
    await refundUsage({ db, uid, kind: "plan", now });
  } catch (error) {
    console.error("Credit refund failed:", error);
  }
}
