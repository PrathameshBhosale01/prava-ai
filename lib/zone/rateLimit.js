import { rateLimited } from "./errors.js";

// Fixed-window limiter backed by one tiny Firestore doc per user:
//   zone_rate_limits/{uid} → { post: {start, count}, comment: {...}, upload: {...} }
// It runs in a transaction, so parallel requests can't sneak past the limit, and it
// needs no composite index (unlike counting recent posts with a query).

export const RATE_LIMITS = {
  post: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 stories / hour
  comment: { limit: 30, windowMs: 10 * 60 * 1000 }, // 30 comments / 10 min
  upload: { limit: 40, windowMs: 60 * 60 * 1000 }, // 40 photos / hour
};

export async function consumeRateLimit({ db, uid, action, now = new Date(), rules = RATE_LIMITS }) {
  const rule = rules[action];
  if (!rule) throw new Error(`Unknown rate-limit action: ${action}`);

  const ref = db.collection("zone_rate_limits").doc(uid);
  const t = now.getTime();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const entry = snap.exists ? snap.data()[action] : null;

    if (!entry || t - entry.start >= rule.windowMs) {
      tx.set(ref, { [action]: { start: t, count: 1 } }, { merge: true });
      return { remaining: rule.limit - 1 };
    }
    if (entry.count >= rule.limit) {
      throw rateLimited(Math.max(Math.ceil((entry.start + rule.windowMs - t) / 1000), 1));
    }
    tx.set(ref, { [action]: { start: entry.start, count: entry.count + 1 } }, { merge: true });
    return { remaining: rule.limit - entry.count - 1 };
  });
}
