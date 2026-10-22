// "Verified creator" badge: shown next to the name of writers who are on a plan that includes it (Pro).
// Computed at READ time from the writer's current subscription, so it appears on old posts after upgrading
// and disappears after a plan ends. Only a yes/no ever reaches the browser, never the subscription itself.

import { can, resolvePlan } from "../plans.js";

/** Set of uids (from `uids`) whose plan includes the badge. Any lookup failure just means "not verified". */
export async function verifiedAuthorUids({ db, uids, now = new Date() }) {
  const unique = [...new Set((uids ?? []).filter((u) => typeof u === "string" && u))];
  const found = await Promise.all(
    unique.map(async (uid) => {
      try {
        const snap = await db.collection("users").doc(uid).get();
        return snap.exists && can(resolvePlan(snap.data(), now), "verifiedBadge") ? uid : null;
      } catch {
        return null;
      }
    }),
  );
  return new Set(found.filter(Boolean));
}

/** Adds `author.verified` to serialized posts or comments. */
export async function withVerifiedAuthors({ db, items, now }) {
  const verified = await verifiedAuthorUids({ db, uids: items.map((i) => i.author?.uid), now });
  return items.map((item) => ({ ...item, author: { ...item.author, verified: verified.has(item.author?.uid) } }));
}
