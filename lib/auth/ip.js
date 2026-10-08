import { createHash } from "node:crypto";

// Signups happen before anyone is signed in, so abuse limits are keyed on the caller's IP.
// We hash it: the rate-limit doc id is then a safe fixed-length string and we never store
// raw IP addresses.

export function clientIpKey(headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim() || "unknown";
  return `ip_${createHash("sha256").update(ip).digest("hex").slice(0, 32)}`;
}

export const SIGNUP_RATE_RULES = { signup: { limit: 8, windowMs: 60 * 60 * 1000 } }; // 8 accounts / hour / IP
