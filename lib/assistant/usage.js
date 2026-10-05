import { USAGE_LIMITS, USAGE_TIMEZONE } from "./config.js";
import { dateKey } from "./dates.js";

// Per-user daily usage, stored on the user's document as:
//   users/{uid}.aiUsage = { day: "YYYY-MM-DD", messages: n, plans: n }
// The counters reset automatically when the (IST) calendar day changes.
// Reservations run inside a Firestore transaction so concurrent requests
// cannot exceed the limit. `db` is the Admin SDK Firestore instance.

const FIELD = { message: "messages", plan: "plans" };

const meter = (used, limit) => ({ used, limit, remaining: Math.max(limit - used, 0) });

function readUsage(data, now) {
  const day = dateKey(now, USAGE_TIMEZONE);
  const stored = data?.aiUsage;
  if (stored?.day === day) {
    return {
      day,
      messages: Math.max(Number(stored.messages) || 0, 0),
      plans: Math.max(Number(stored.plans) || 0, 0),
    };
  }
  return { day, messages: 0, plans: 0 };
}

/** Shape sent to the browser so the UI can show remaining quota. */
export function buildSnapshot(data, now = new Date()) {
  const plan = data?.subscription === "pro" ? "pro" : "free";
  const limits = USAGE_LIMITS[plan];
  const usage = readUsage(data, now);
  return {
    plan,
    messages: meter(usage.messages, limits.messagesPerDay),
    plans: meter(usage.plans, limits.plansPerDay),
  };
}

/** Read-only snapshot for the current user. */
export async function getUsageSnapshot({ db, uid, now = new Date() }) {
  const snap = await db.collection("users").doc(uid).get();
  return buildSnapshot(snap.exists ? snap.data() : {}, now);
}

/**
 * Atomically reserves one unit of `kind` ("message" | "plan").
 * @returns {Promise<{ allowed: boolean, snapshot: object }>}
 */
export async function reserveUsage({ db, uid, kind, now = new Date() }) {
  const field = FIELD[kind];
  if (!field) throw new Error(`Unknown usage kind: ${kind}`);

  const ref = db.collection("users").doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const usage = readUsage(data, now);
    const snapshot = buildSnapshot(data, now);

    if (snapshot[field].remaining <= 0) return { allowed: false, snapshot };

    const next = { ...usage, [field]: usage[field] + 1 };
    tx.set(ref, { aiUsage: next }, { merge: true });

    return { allowed: true, snapshot: buildSnapshot({ ...data, aiUsage: next }, now) };
  });
}

/** Gives back a unit when the request failed before the user got anything useful. */
export async function refundUsage({ db, uid, kind, now = new Date() }) {
  const field = FIELD[kind];
  if (!field) return;

  const ref = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const data = snap.data();
    const usage = readUsage(data, now);
    if (usage[field] <= 0) return;

    tx.set(ref, { aiUsage: { ...usage, [field]: usage[field] - 1 } }, { merge: true });
  });
}