import { USAGE_TIMEZONE } from "./config.js";
import { dateKey } from "./dates.js";
import { CREDIT_COSTS, creditCost, creditPeriod, getPlan, resolvePlan } from "../plans.js";

// Monthly AI credits per user, stored on the user's document as:
//   users/{uid}.aiCredits = { period: "YYYY-MM", used: n }
// The pool resets automatically when the (IST) calendar month changes. What each action costs and
// how many credits each plan gets lives in lib/plans.js. Reservations run inside a Firestore
// transaction so concurrent requests cannot overspend. `db` is the Admin SDK Firestore instance.

const meter = (used, limit) => ({ used, limit, remaining: Math.max(limit - used, 0) });

function readUsed(data, now) {
  const stored = data?.aiCredits;
  if (stored?.period === creditPeriod(now)) return Math.max(Number(stored.used) || 0, 0);
  return 0;
}

/** "2026-10-17" → "2026-11-01": the day the credits come back. */
export function nextResetKey(now = new Date()) {
  const [year, month] = dateKey(now, USAGE_TIMEZONE).split("-").map(Number);
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return `${next.y}-${String(next.m).padStart(2, "0")}-01`;
}

/** "2026-11-01" → "1 Nov" */
export function formatResetDate(key) {
  const date = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Shape sent to the browser so the UI can show remaining credits. */
export function buildSnapshot(data, now = new Date()) {
  const plan = resolvePlan(data, now);
  return {
    plan,
    period: creditPeriod(now),
    resetsOn: nextResetKey(now),
    credits: meter(readUsed(data, now), getPlan(plan).credits),
    costs: CREDIT_COSTS,
  };
}

/** The sentence shown when an action can't be afforded. Safe to show to the user as-is. */
export function creditLimitMessage(snapshot, cost) {
  const { remaining, limit } = snapshot.credits;
  const when = formatResetDate(snapshot.resetsOn);
  const base =
    remaining <= 0
      ? `You've used all ${limit} AI credits for this month. They reset on ${when}.`
      : `That needs ${cost} AI credits and you have ${remaining} left this month. They reset on ${when}.`;
  return snapshot.plan === "free" ? `${base} Upgrade to Pro for ${getPlan("pro").credits} credits a month.` : base;
}

/** Read-only snapshot for the current user. */
export async function getUsageSnapshot({ db, uid, now = new Date() }) {
  const snap = await db.collection("users").doc(uid).get();
  return buildSnapshot(snap.exists ? snap.data() : {}, now);
}

/**
 * Atomically reserves the credits `kind` costs ("message" | "plan" | "regenerateDay" | "refine").
 * @returns {Promise<{ allowed: boolean, cost: number, snapshot: object }>}
 */
export async function reserveUsage({ db, uid, kind, now = new Date() }) {
  const cost = creditCost(kind);
  const ref = db.collection("users").doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const snapshot = buildSnapshot(data, now);

    if (snapshot.credits.remaining < cost) return { allowed: false, cost, snapshot };

    const aiCredits = { period: creditPeriod(now), used: readUsed(data, now) + cost };
    tx.set(ref, { aiCredits }, { merge: true });

    return { allowed: true, cost, snapshot: buildSnapshot({ ...data, aiCredits }, now) };
  });
}

/** Gives the credits back when the request failed before the user got anything useful. */
export async function refundUsage({ db, uid, kind, now = new Date() }) {
  const cost = creditCost(kind);
  const ref = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const used = readUsed(snap.data(), now);
    if (used <= 0) return;

    tx.set(ref, { aiCredits: { period: creditPeriod(now), used: Math.max(used - cost, 0) } }, { merge: true });
  });
}
