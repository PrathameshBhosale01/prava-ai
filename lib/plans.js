// The ONE place that says what Free and Pro get. UI, API routes and the webhook all read this,
// so a limit is never written twice. Pure module: no Firebase, no React, no network (easy to test).
//
// Stored per user (written ONLY by the payment webhook, via the Admin SDK):
//   users/{uid}.subscription = {
//     plan: "pro", status: "active" | "trialing" | "past_due" | "canceled" | ...,
//     interval: "month" | "year", currentPeriodEnd: Timestamp | ISO string | ms,
//     cancelAtPeriodEnd: boolean, customerId, subscriptionId
//   }
// Older data used the plain string `subscription: "pro"`; that still counts as Pro.

import { USAGE_TIMEZONE } from "./assistant/config.js";
import { dateKey } from "./assistant/dates.js";

export const PLAN_IDS = ["free", "pro"];

export const PLANS = {
  free: {
    id: "free",
    name: "Free Explorer",
    credits: 30, // AI credits per month
    maxTrips: 10,
    maxStops: 3,
    maxTripDays: 10,
    fullRegeneratesPerTrip: 1,
    features: { dayRegenerate: false, refine: false, exportData: false, verifiedBadge: false, earlyAccess: false },
  },
  pro: {
    id: "pro",
    name: "Pro Wanderer",
    credits: 150,
    maxTrips: 25,
    maxStops: 6,
    maxTripDays: 21,
    fullRegeneratesPerTrip: Infinity,
    features: { dayRegenerate: true, refine: true, exportData: true, verifiedBadge: true, earlyAccess: true },
  },
};

/** What one AI action costs out of the monthly credit pool. */
export const CREDIT_COSTS = {
  message: 1, // one chat message
  regenerateDay: 1, // redo a single day
  refine: 2, // "make day 3 more relaxed"
  plan: 5, // a whole itinerary (also a full regenerate)
};

/** Prices in whole rupees. Yearly is billed once a year; the per-month figure is for display. */
export const PRICING = { currency: "INR", monthly: 200, yearly: 2000 };

export function pricingSummary() {
  const perMonthYearly = Math.round(PRICING.yearly / 12);
  return {
    currency: PRICING.currency,
    monthly: PRICING.monthly,
    yearly: PRICING.yearly,
    yearlyPerMonth: perMonthYearly,
    yearlySavings: PRICING.monthly * 12 - PRICING.yearly,
  };
}

/** Human labels for the features, used on the plans page and upgrade prompts. */
export const FEATURE_LABELS = {
  dayRegenerate: "Regenerate a single day",
  refine: "Refine your itinerary with AI",
  exportData: "JSON and calendar (.ics) export",
  verifiedBadge: "Verified creator badge",
  earlyAccess: "Early access to new features",
};

/* ------------------------------ who is Pro? ------------------------------ */

const DAY_MS = 86_400_000;
const PAST_DUE_GRACE_DAYS = 3;

function toMillis(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * "free" or "pro" for a users/{uid} document.
 *  - active / trialing → Pro
 *  - canceled → Pro only until the period they already paid for ends
 *  - past_due → Pro for a short grace window after the period ends (card retries)
 *  - anything else, or no subscription → Free
 */
export function resolvePlan(userData, now = new Date()) {
  const sub = userData?.subscription;
  if (sub === "pro") return "pro"; // legacy flag
  if (!sub || typeof sub !== "object" || sub.plan !== "pro") return "free";

  const status = String(sub.status ?? "").toLowerCase();
  if (status === "active" || status === "trialing") return "pro";

  const end = toMillis(sub.currentPeriodEnd);
  if (end === null) return "free";
  if (status === "canceled") return now.getTime() < end ? "pro" : "free";
  if (status === "past_due") return now.getTime() < end + PAST_DUE_GRACE_DAYS * DAY_MS ? "pro" : "free";
  return "free";
}

export const getPlan = (planId) => PLANS[planId] ?? PLANS.free;

export const can = (planId, feature) => getPlan(planId).features[feature] === true;

/* --------------------------------- credits -------------------------------- */

/** Credits reset on the 1st of each month (IST). "2026-10" identifies the current cycle. */
export function creditPeriod(now = new Date()) {
  return dateKey(now, USAGE_TIMEZONE).slice(0, 7);
}

export function creditCost(kind) {
  const cost = CREDIT_COSTS[kind];
  if (!Number.isInteger(cost)) throw new Error(`Unknown credit kind: ${kind}`);
  return cost;
}

/* ---------------------------- limits for a trip --------------------------- */

const fail = (code, message, limit) => ({ ok: false, code, message, limit, upgrade: true });

/**
 * Checks the plan's trip limits before something is created or saved.
 * @param {{ tripCount?: number, stops?: number, days?: number }} usage  what the user is about to have
 *   (tripCount = trips they already own, so creating one more is checked as tripCount + 1)
 */
export function checkTripLimits(planId, { tripCount, stops, days } = {}) {
  const plan = getPlan(planId);

  if (Number.isFinite(tripCount) && tripCount + 1 > plan.maxTrips) {
    return fail("TRIP_COUNT", `${plan.name} includes up to ${plan.maxTrips} trips. Delete one or upgrade for more.`, plan.maxTrips);
  }
  if (Number.isFinite(stops) && stops > plan.maxStops) {
    return fail("STOP_COUNT", `${plan.name} supports up to ${plan.maxStops} cities per trip.`, plan.maxStops);
  }
  if (Number.isFinite(days) && days > plan.maxTripDays) {
    return fail("TRIP_DAYS", `${plan.name} supports trips up to ${plan.maxTripDays} days.`, plan.maxTripDays);
  }
  return { ok: true };
}

/** Free plans get a limited number of full regenerations per trip. */
export function checkRegenerate(planId, regeneratesUsed = 0) {
  const plan = getPlan(planId);
  if ((Number(regeneratesUsed) || 0) >= plan.fullRegeneratesPerTrip) {
    return fail(
      "REGENERATE_LIMIT",
      `${plan.name} includes ${plan.fullRegeneratesPerTrip} full regenerate per trip. Upgrade for unlimited.`,
      plan.fullRegeneratesPerTrip,
    );
  }
  return { ok: true };
}
