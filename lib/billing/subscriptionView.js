// What the Subscription page says about the person's plan. Pure: give it the users/{uid} data and "now".

import { PLANS, resolvePlan } from "../plans.js";

const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

function toMillis(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export const formatDate = (ms) => (ms === null ? "" : fmt.format(new Date(ms)));

/**
 * @returns {{
 *   planId: "free"|"pro", name: string,
 *   badge: string, tone: "neutral"|"success"|"warning"|"danger",
 *   detail: string,           // one line under the plan name
 *   interval: "month"|"year"|null,
 *   hasBilling: boolean,      // there is a Polar customer to open the portal for
 *   canUpgrade: boolean,      // show the Upgrade buttons
 *   attention: string,        // non-empty = a banner (payment problem)
 * }}
 */
export function describeSubscription(userData, now = new Date()) {
  const planId = resolvePlan(userData, now);
  const sub = userData?.subscription && typeof userData.subscription === "object" ? userData.subscription : null;
  const status = String(sub?.status ?? "").toLowerCase();
  const end = toMillis(sub?.currentPeriodEnd);
  const interval = sub?.interval === "year" || sub?.interval === "month" ? sub.interval : null;
  const hasBilling = Boolean(sub?.customerId);
  const base = { planId, name: PLANS[planId].name, interval, hasBilling, attention: "" };

  if (planId === "free") {
    const lapsed = sub?.plan === "pro";
    return {
      ...base,
      badge: "Free",
      tone: "neutral",
      detail: lapsed ? "Your Pro plan has ended. You're back on Free." : "You're on the Free plan.",
      canUpgrade: true,
    };
  }

  if (!sub) return { ...base, badge: "Pro", tone: "success", detail: "Pro plan.", canUpgrade: false }; // legacy flag

  if (status === "past_due") {
    return {
      ...base,
      badge: "Payment failed",
      tone: "danger",
      detail: "We couldn't charge your card. Pro stays on for a few days while we retry.",
      canUpgrade: false,
      attention: "Your last payment failed. Update your card in Manage billing to keep Pro.",
    };
  }

  if (status === "canceled" || sub.cancelAtPeriodEnd === true) {
    return {
      ...base,
      badge: "Cancels soon",
      tone: "warning",
      detail: end ? `Pro until ${formatDate(end)}, then you move to Free. You won't be charged again.` : "Pro until the end of your billing period. You won't be charged again.",
      canUpgrade: false,
    };
  }

  const every = interval === "year" ? "yearly" : interval === "month" ? "monthly" : "";
  return {
    ...base,
    badge: status === "trialing" ? "Trial" : "Active",
    tone: "success",
    detail: end ? `Renews ${every ? `${every} on` : "on"} ${formatDate(end)}.` : "Your Pro plan is active.",
    canUpgrade: false,
  };
}

export const FAQ = [
  {
    q: "What are AI credits?",
    a: "Every AI action spends credits from a monthly pool: 1 for a chat message or redoing one day, 2 for refining a day with your instruction, and 5 for a full trip plan. Free gets 30 a month, Pro gets 150. They reset on the 1st (IST), and unused credits don't carry over.",
  },
  {
    q: "What happens if I run out of credits?",
    a: "AI actions pause until your credits reset on the 1st. Everything you've already saved (trips, plans, expenses) stays available, and you can still edit trips by hand.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Open Manage billing and cancel. You keep Pro until the end of the period you've already paid for, then you move to Free. Nothing is deleted.",
  },
  {
    q: "What happens to my trips if I go back to Free?",
    a: "They all stay. If you have more trips, cities or days than Free allows, you can still view and print them. You just can't create new ones above the Free limits until you're under them or upgrade again.",
  },
  {
    q: "How do I change my card or get an invoice?",
    a: "Manage billing opens our payment partner's customer portal, where you can update your card, switch plans and download invoices.",
  },
  {
    q: "Is there a refund?",
    a: "Payments are handled by our payment partner. If something went wrong with a charge, contact us and we'll sort it out.",
  },
];

/** Short bullet list for a plan card / the pricing page, always built from lib/plans.js so it can't drift. */
export function planBullets(planId) {
  const p = PLANS[planId];
  const chat = p.chatPlansPerMonth === Infinity ? "Build trip plans in chat, limited only by credits" : `${p.chatPlansPerMonth} trip plans built in chat per month`;
  const bullets = [
    `${p.credits} AI credits per month`,
    `Up to ${p.maxTrips} trips`,
    `Up to ${p.maxStops} cities and ${p.maxTripDays} days per trip`,
    chat,
  ];
  if (p.fullRegeneratesPerTrip > 0) bullets.push("Regenerate a full itinerary anytime");
  if (p.features.dayRegenerate) bullets.push("Regenerate or refine a single day with AI");
  if (p.features.exportData) bullets.push("Export to JSON and your calendar (.ics)");
  if (p.features.verifiedBadge) bullets.push("Verified creator badge in Zone");
  if (p.features.earlyAccess) bullets.push("Early access to new features");
  if (planId === "free") bullets.push("Print / save as PDF, Zone, Tools and Insights");
  return bullets;
}
