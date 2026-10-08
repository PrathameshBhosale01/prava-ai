// One error type for every "expected" failure, so routes can turn it into a
// clean JSON response and anything else into a generic 500.

export class ZoneError extends Error {
  constructor(status, message, { code = "error", fields, retryAfter } = {}) {
    super(message);
    this.name = "ZoneError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.retryAfter = retryAfter; // seconds; surfaced as a Retry-After header on 429s
  }
}

export const unauthorized = (message = "Please sign in again.") =>
  new ZoneError(401, message, { code: "unauthorized" });

export const forbidden = (message = "You don't have permission to do that.") =>
  new ZoneError(403, message, { code: "forbidden" });

export const notFound = (what = "Post") =>
  new ZoneError(404, `${what} not found.`, { code: "not_found" });

export const badRequest = (message, fields) =>
  new ZoneError(400, message, { code: "invalid", fields });

const humanWait = (seconds) => (seconds < 90 ? `${seconds} seconds` : `${Math.ceil(seconds / 60)} minutes`);

export const rateLimited = (retryAfter) =>
  new ZoneError(429, `You're doing that a lot — try again in ${humanWait(retryAfter)}.`, { code: "rate_limited", retryAfter });

/** A filter/sort combination needs a Firestore composite index that hasn't been created yet. */
export const indexRequired = () =>
  new ZoneError(503, "This view needs a one-time database setup. Please let the site admin know.", { code: "index_required" });

/**
 * Firestore reports a missing composite index as FAILED_PRECONDITION (gRPC code 9) with a
 * console link in the message. Log that for the developer, show users something calm.
 */
export const isMissingIndexError = (error) =>
  error?.code === 9 || (/FAILED_PRECONDITION/.test(String(error?.message)) && /index/i.test(String(error?.message)));
