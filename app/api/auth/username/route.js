import { adminDb } from "@/lib/firebaseAdmin";
import { isUsernameAvailable } from "@/lib/auth/service";
import { route } from "@/lib/zone/http";

/** GET /api/auth/username?u=name → { available, reason? }. Public: it's used before sign-up. */
export const GET = route(async (request) => {
  const username = (new URL(request.url).searchParams.get("u") || "").slice(0, 50);
  const result = await isUsernameAvailable({ db: adminDb, username });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
});
