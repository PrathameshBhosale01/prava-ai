import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { clientIpKey, SIGNUP_RATE_RULES } from "@/lib/auth/ip";
import { createAccount, prepareSignup } from "@/lib/auth/service";
import { readJson, route } from "@/lib/zone/http";
import { consumeRateLimit } from "@/lib/zone/rateLimit";

/**
 * POST /api/auth/signup { email, password, name, username, interests } → 201 { ok: true }
 * Creates the account + profile and claims the username atomically. The browser then
 * signs in with the same email/password using the Firebase client SDK.
 */
export const POST = route(async (request) => {
  const input = await readJson(request);
  const values = prepareSignup(input); // 400 with per-field messages; costs us nothing
  await consumeRateLimit({ db: adminDb, uid: clientIpKey(request.headers), action: "signup", rules: SIGNUP_RATE_RULES });
  await createAccount({ db: adminDb, adminAuth, values });
  return Response.json({ ok: true }, { status: 201 });
});
