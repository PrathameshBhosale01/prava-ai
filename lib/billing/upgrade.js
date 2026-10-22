// Pure helpers behind the "Upgrade to Pro" prompt: what to say for each limit, which perks to list,
// and the browser-side call that fetches a checkout link. No React, so it is easy to test.

import { FEATURE_LABELS, PLANS, pricingSummary } from "../plans.js";

/** Headline per reason. Reasons are the `code`s the server and checkTripLimits already use. */
const TITLES = {
  LIMIT_REACHED: "You're out of AI credits",
  REGENERATE_LIMIT: "Regenerate is a Pro feature",
  CHAT_PLAN_LIMIT: "Chat plans are limited on Free",
  DAY_REGENERATE: "Day-by-day regenerate is Pro",
  REFINE: "Refine with AI is Pro",
  EXPORT: "Exports are a Pro feature",
  TRIP_COUNT: "You've hit your trip limit",
  STOP_COUNT: "Room for more cities",
  TRIP_DAYS: "Longer trips are a Pro thing",
};
const DEFAULT_TITLE = "Upgrade to Pro Wanderer";
const DEFAULT_MESSAGE = "Get 5x the AI credits, more trips and cities, and the tools that make planning faster.";

/** Which perk row to highlight for a reason. */
const HIGHLIGHT = { LIMIT_REACHED: "credits", REGENERATE_LIMIT: "regenerates", CHAT_PLAN_LIMIT: "chatPlans", DAY_REGENERATE: "dayRegenerate", REFINE: "refine", EXPORT: "exportData", TRIP_COUNT: "trips", STOP_COUNT: "cities", TRIP_DAYS: "days" };

export function upgradePrompt(reason, message) {
  return {
    reason: reason in TITLES ? reason : null,
    title: TITLES[reason] ?? DEFAULT_TITLE,
    message: typeof message === "string" && message.trim() ? message.trim() : DEFAULT_MESSAGE,
    highlight: HIGHLIGHT[reason] ?? null,
  };
}

/** If a server answer says "upgrade would fix this", returns what the dialog needs; otherwise null. */
export function upgradeFromResponse(body) {
  if (!body || body.upgrade !== true) return null;
  return { reason: body.code, message: body.error };
}

/** The message for a plan limit, e.g. when the form's "add city" button is pressed at the cap. */
export function limitMessage(planId, code) {
  const plan = PLANS[planId] ?? PLANS.free;
  if (code === "STOP_COUNT") return `${plan.name} supports up to ${plan.maxStops} cities per trip.`;
  if (code === "TRIP_DAYS") return `${plan.name} supports trips up to ${plan.maxTripDays} days.`;
  if (code === "TRIP_COUNT") return `${plan.name} includes up to ${plan.maxTrips} trips. Delete one or upgrade for more.`;
  return DEFAULT_MESSAGE;
}

const rupees = (n) => `₹${n.toLocaleString("en-IN")}`;

/** Billing choices for the dialog, with the price lines already formatted. */
export function billingOptions() {
  const p = pricingSummary();
  return [
    { interval: "year", label: "Yearly", price: `${rupees(p.yearlyPerMonth)}/mo`, note: `${rupees(p.yearly)} billed yearly`, badge: `Save ${rupees(p.yearlySavings)}`, cta: `${rupees(p.yearlyPerMonth)}/mo` },
    { interval: "month", label: "Monthly", price: `${rupees(p.monthly)}/mo`, note: "Cancel anytime", badge: "", cta: `${rupees(p.monthly)}/mo` },
  ];
}

/** Rows for the Free vs Pro table. `key` matches the highlight names above. */
export function perkRows() {
  const { free, pro } = PLANS;
  const yes = (on) => (on ? "Included" : "—");
  return [
    { key: "credits", label: "AI credits / month", free: String(free.credits), pro: String(pro.credits) },
    { key: "trips", label: "Active trips", free: String(free.maxTrips), pro: String(pro.maxTrips) },
    { key: "cities", label: "Cities per trip", free: String(free.maxStops), pro: String(pro.maxStops) },
    { key: "days", label: "Trip length", free: `${free.maxTripDays} days`, pro: `${pro.maxTripDays} days` },
    { key: "chatPlans", label: "Trip plans built in chat / month", free: String(free.chatPlansPerMonth), pro: "As credits allow" },
    { key: "regenerates", label: "Regenerate a full itinerary", free: "—", pro: "Unlimited" },
    ...Object.keys(FEATURE_LABELS).map((feature) => ({ key: feature, label: FEATURE_LABELS[feature], free: yes(free.features[feature]), pro: yes(pro.features[feature]) })),
  ];
}

/**
 * Asks our server for a Polar link (checkout or customer portal).
 * @returns the url. Throws an Error whose message is safe to show.
 */
export async function requestBillingUrl({ path, body, token, fetchImpl = fetch }) {
  let response;
  try {
    response = await fetchImpl(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Something went wrong. Please try again.");
  if (typeof data?.url !== "string" || !/^https:\/\//.test(data.url)) throw new Error("We didn't get a checkout link. Please try again.");
  return data.url;
}
