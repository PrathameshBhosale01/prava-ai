import { verifyIdToken } from "@/lib/serverAuth";
import { adminDb } from "@/lib/firebaseAdmin";

import { badRequest, indexRequired, isMissingIndexError, unauthorized, ZoneError } from "./errors.js";
import { consumeRateLimit } from "./rateLimit.js";

/**
 * Verifies the Firebase ID token and returns the caller's identity.
 * The `author` object is built from the VERIFIED token, never from the request
 * body, so a client can't post or comment as someone else.
 */
export async function requireUser(request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw unauthorized();

  let decoded;
  try {
    decoded = await verifyIdToken(header.slice(7));
  } catch {
    throw unauthorized();
  }

  const name = decoded.name || decoded.email?.split("@")[0] || "Traveler";
  return {
    uid: decoded.uid,
    author: { uid: decoded.uid, name, photoURL: decoded.picture || "" },
  };
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}

/** Counts one use of `action` for this user; throws a 429 ZoneError once they're over the limit. */
export const enforceLimit = (uid, action) => consumeRateLimit({ db: adminDb, uid, action });

/** Wraps a route handler: expected ZoneErrors → JSON with the right status, anything else → logged 500. */
export function route(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (raw) {
      let error = raw;
      if (!(error instanceof ZoneError) && isMissingIndexError(error)) {
        console.error("Zone API: missing Firestore index —", raw.message); // the message contains the one-click create link
        error = indexRequired();
      }
      if (error instanceof ZoneError) {
        const headers = error.retryAfter ? { "Retry-After": String(error.retryAfter) } : undefined;
        return Response.json({ error: error.message, code: error.code, fields: error.fields }, { status: error.status, headers });
      }
      console.error("Zone API error:", error);
      return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

export const cloudName = () => process.env.CLOUDINARY_CLOUD_NAME || "";
