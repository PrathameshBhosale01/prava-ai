const DEFAULT_PATH = "/dashboard";

/**
 * Only same-site paths may be used as the post-login destination (`?next=`).
 * Anything else — other sites, protocol-relative "//evil.com", backslash tricks,
 * javascript: URLs, the auth pages themselves (redirect loops) — falls back.
 */
export function safeNextPath(next, fallback = DEFAULT_PATH) {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.includes("\\") || /[\u0000-\u001F\u007F]/.test(next)) return fallback;
  if (/^\/(login|signup)(\/|\?|#|$)/.test(next)) return fallback;
  return next;
}
