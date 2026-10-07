import { adminDb } from "@/lib/firebaseAdmin";
import { readJson, requireUser, route } from "@/lib/zone/http";
import { deleteComment, updateComment } from "@/lib/zone/service";

export const PATCH = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id, commentId } = await params;
  const input = await readJson(request);
  return Response.json({ comment: await updateComment({ db: adminDb, uid, postId: id, commentId, input }) });
});

export const DELETE = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id, commentId } = await params;
  return Response.json(await deleteComment({ db: adminDb, uid, postId: id, commentId }));
});
