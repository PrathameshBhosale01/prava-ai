import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { completeProfile } from "@/lib/auth/profileService";
import { readJson, requireUser, route } from "@/lib/zone/http";
import { consumeRateLimit } from "@/lib/zone/rateLimit";

const PROFILE_RATE_RULES = { profile: { limit: 20, windowMs: 60 * 60 * 1000 } };

/**
 * POST /api/auth/profile { name, username, interests } → { ok: true, username }
 * Signed-in users only. Claims the username and fills in the profile atomically.
 */
export const POST = route(async (request) => {
  const { uid } = await requireUser(request);
  await consumeRateLimit({ db: adminDb, uid, action: "profile", rules: PROFILE_RATE_RULES });
  const input = await readJson(request);
  const { username } = await completeProfile({ db: adminDb, adminAuth, uid, input });
  return Response.json({ ok: true, username });
});
