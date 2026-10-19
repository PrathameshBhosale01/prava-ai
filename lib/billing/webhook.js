// Checks that a webhook really came from Polar, and turns subscription events into the
// `users/{uid}.subscription` field that lib/plans.js reads. This is the ONLY code that writes it.
//
// Signing follows the Standard Webhooks spec: HMAC-SHA256 over "<id>.<timestamp>.<raw body>",
// sent as "v1,<base64>" in the `webhook-signature` header (space-separated if several).
// Polar secrets made before 8 Sep 2026 use the whole "whsec_…" text as the key; newer ones use the
// base64 part after "whsec_". We accept either, so rotating the secret never breaks us.

import { createHmac, timingSafeEqual } from "node:crypto";

export class WebhookError extends Error {
  constructor(message) {
    super(message);
    this.name = "WebhookError";
  }
}

const TOLERANCE_SECONDS = 5 * 60;

function header(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  return headers[name] ?? headers[name.toLowerCase()] ?? null;
}

const sign = (key, content) => createHmac("sha256", key).update(content).digest();

/**
 * @param {string} body  the RAW request body (exactly as received: don't parse it first)
 * @returns the parsed event. Throws WebhookError when the signature, timestamp or JSON is bad.
 */
export function verifyWebhook({ body, headers, secret, now = Date.now() }) {
  if (!secret) throw new WebhookError("Webhook secret is not configured");
  if (typeof body !== "string") throw new WebhookError("Missing body");

  const id = header(headers, "webhook-id");
  const timestamp = header(headers, "webhook-timestamp");
  const signatures = header(headers, "webhook-signature");
  if (!id || !timestamp || !signatures) throw new WebhookError("Missing signature headers");

  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) throw new WebhookError("Bad timestamp");
  if (Math.abs(now / 1000 - seconds) > TOLERANCE_SECONDS) throw new WebhookError("Timestamp too old or too new");

  const content = `${id}.${timestamp}.${body}`;
  const keys = [Buffer.from(secret.replace(/^whsec_/, ""), "base64"), Buffer.from(secret, "utf8")];
  const expected = keys.map((key) => sign(key, content));

  const received = String(signatures)
    .split(" ")
    .map((part) => part.split(","))
    .filter(([version, value]) => version === "v1" && value)
    .map(([, value]) => Buffer.from(value, "base64"));

  const valid = received.some((candidate) => expected.some((good) => good.length === candidate.length && timingSafeEqual(good, candidate)));
  if (!valid) throw new WebhookError("Invalid signature");

  try {
    return JSON.parse(body);
  } catch {
    throw new WebhookError("Body is not JSON");
  }
}

/* --------------------------- event → user update --------------------------- */

export const SUBSCRIPTION_EVENTS = [
  "subscription.created",
  "subscription.active",
  "subscription.updated",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.revoked",
];

const iso = (value) => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

/**
 * Pure: what should we store for this event?
 * @returns {{ uid: string, subscription: object } | { ignored: string }}
 */
export function subscriptionFromEvent(event, { productIds = [] } = {}) {
  if (!event || !SUBSCRIPTION_EVENTS.includes(event.type)) return { ignored: "not a subscription event" };
  const data = event.data;
  if (!data || typeof data !== "object") return { ignored: "no data" };

  const product = data.product_id ?? data.product?.id;
  if (productIds.length > 0 && !productIds.includes(product)) return { ignored: "another product" };

  const uid = data.customer?.external_id || data.metadata?.uid;
  if (typeof uid !== "string" || !uid.trim()) return { ignored: "no user id on the subscription" };

  // An ended subscription (ended_at set) loses access straight away, even if its period hasn't run out.
  const status = data.ended_at ? "revoked" : String(data.status ?? "").toLowerCase();

  return {
    uid: uid.trim(),
    subscription: {
      plan: "pro",
      status,
      interval: data.recurring_interval === "year" ? "year" : "month",
      currentPeriodEnd: iso(data.current_period_end),
      cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
      customerId: data.customer_id ?? data.customer?.id ?? null,
      subscriptionId: data.id ?? null,
      modifiedAt: iso(data.modified_at ?? event.timestamp) ?? new Date().toISOString(),
    },
  };
}

const LIVE = new Set(["active", "trialing"]);

/**
 * Saves the event on the user's document (Admin SDK `db`). Safe to receive twice or out of order:
 *  - an older update for the same subscription never overwrites a newer one;
 *  - the end of an OLD subscription never cancels a newer live one.
 * @returns {Promise<{ applied: boolean, reason?: string, uid?: string }>}
 */
export async function applySubscriptionEvent({ db, event, productIds }) {
  const parsed = subscriptionFromEvent(event, { productIds });
  if (parsed.ignored) return { applied: false, reason: parsed.ignored };

  const { uid, subscription } = parsed;
  const ref = db.collection("users").doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { applied: false, reason: "unknown user", uid };

    const current = snap.data()?.subscription;
    if (current && typeof current === "object") {
      const sameSubscription = current.subscriptionId === subscription.subscriptionId;
      if (sameSubscription && current.modifiedAt && Date.parse(current.modifiedAt) > Date.parse(subscription.modifiedAt)) {
        return { applied: false, reason: "stale event", uid };
      }
      if (!sameSubscription && LIVE.has(current.status) && !LIVE.has(subscription.status)) {
        return { applied: false, reason: "older subscription ended", uid };
      }
    }

    tx.set(ref, { subscription }, { merge: true });
    return { applied: true, uid };
  });
}
