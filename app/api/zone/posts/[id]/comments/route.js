import { adminDb } from "@/lib/firebaseAdmin";
import { readJson, requireUser, route } from "@/lib/zone/http";
import { addComment, listComments } from "@/lib/zone/service";

export const GET = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id } = await params;
  return Response.json({ comments: await listComments({ db: adminDb, uid, postId: id }) });
});

/** POST { text } → { comment } */
export const POST = route(async (request, { params }) => {
  const { author } = await requireUser(request);
  const { id } = await params;
  const input = await readJson(request);
  const comment = await addComment({ db: adminDb, postId: id, author, input });
  return Response.json({ comment }, { status: 201 });
});
