import { adminDb } from "@/lib/firebaseAdmin";
import { readJson, requireUser, route } from "@/lib/zone/http";
import { badRequest } from "@/lib/zone/errors";
import { setLike } from "@/lib/zone/service";

/** PUT /api/zone/posts/:id/like { liked: boolean } → { liked, likeCount }. Idempotent. */
export const PUT = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id } = await params;
  const { liked } = await readJson(request);
  if (typeof liked !== "boolean") throw badRequest("`liked` must be true or false.");
  return Response.json(await setLike({ db: adminDb, uid, postId: id, liked }));
});
