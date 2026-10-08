import { adminDb } from "@/lib/firebaseAdmin";
import { cloudName, enforceLimit, readJson, requireUser, route } from "@/lib/zone/http";
import { createPost, listPosts } from "@/lib/zone/service";

/** GET /api/zone/posts?q=&category=&author=&sort=new|likes|comments&cursor=&limit= → { posts, nextCursor } */
export const GET = route(async (request) => {
  const { uid } = await requireUser(request);
  const params = new URL(request.url).searchParams;
  const result = await listPosts({
    db: adminDb,
    uid,
    q: (params.get("q") || "").slice(0, 100),
    category: params.get("category") || "",
    authorUid: params.get("author") || "",
    sort: params.get("sort") || "new",
    cursor: params.get("cursor") || "",
    limit: params.get("limit"),
  });
  return Response.json(result);
});

/** POST /api/zone/posts { title, content, category, imageUrls?, coverIndex? } → { post } */
export const POST = route(async (request) => {
  const { uid, author } = await requireUser(request);
  await enforceLimit(uid, "post");
  const input = await readJson(request);
  const post = await createPost({ db: adminDb, author, input, cloudName: cloudName() });
  return Response.json({ post }, { status: 201 });
});
