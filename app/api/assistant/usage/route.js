import { adminDb } from "@/lib/firebaseAdmin";
import { verifyIdToken } from "@/lib/serverAuth";
import { getUsageSnapshot } from "@/lib/assistant/usage";

/** GET /api/assistant/usage → remaining daily assistant quota for the signed-in user. */
export async function GET(request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await verifyIdToken(authorization.substring(7));
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usage = await getUsageSnapshot({ db: adminDb, uid: decoded.uid });
    return Response.json({ usage });
  } catch (error) {
    console.error("Usage lookup failed:", error);
    return Response.json({ error: "Couldn't load usage." }, { status: 500 });
  }
}