// Plan + credit checks for redoing ONE day (Pro): app/api/trips/[id]/itinerary/day.

import { can, creditCost, FEATURE_LABELS } from "../plans.js";
import { dayEditKind } from "../trips/dayEdit.js";
import { creditLimitMessage, getUsageSnapshot, refundUsage, reserveUsage } from "./usage.js";

const FEATURE = { regenerateDay: "dayRegenerate", refine: "refine" };
const CODE = { regenerateDay: "DAY_REGENERATE", refine: "REFINE" };

/**
 * Call BEFORE generating. On success the credits are reserved; call `releaseDayEdit` if generation fails.
 * @returns {Promise<{ ok: true, kind: string, snapshot: object } | { ok: false, status: number, body: object }>}
 */
export async function reserveDayEdit({ db, uid, instruction, now = new Date() }) {
  const kind = dayEditKind(instruction);
  const current = await getUsageSnapshot({ db, uid, now });

  if (!can(current.plan, FEATURE[kind])) {
    return {
      ok: false,
      status: 403,
      body: {
        error: `${FEATURE_LABELS[FEATURE[kind]]} is a Pro feature.`,
        code: CODE[kind],
        upgrade: true,
        usage: current,
      },
    };
  }

  const reservation = await reserveUsage({ db, uid, kind, now });
  if (!reservation.allowed) {
    return {
      ok: false,
      status: 429,
      body: {
        error: creditLimitMessage(reservation.snapshot, creditCost(kind)),
        code: "LIMIT_REACHED",
        upgrade: reservation.snapshot.plan === "free",
        usage: reservation.snapshot,
      },
    };
  }
  return { ok: true, kind, snapshot: reservation.snapshot };
}

/** Gives the credits back after a failed edit. Never throws. */
export async function releaseDayEdit({ db, uid, kind, now = new Date() }) {
  try {
    await refundUsage({ db, uid, kind, now });
  } catch (error) {
    console.error("Credit refund failed:", error);
  }
}
