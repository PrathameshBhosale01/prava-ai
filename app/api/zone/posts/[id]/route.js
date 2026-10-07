import { adminDb } from "@/lib/firebaseAdmin";
import { destroyImages } from "@/lib/zone/cloudinary";
import { cloudName, readJson, requireUser, route } from "@/lib/zone/http";
import { deletePost, getPost, updatePost } from "@/lib/zone/service";

export const GET = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id } = await params;
  return Response.json({ post: await getPost({ db: adminDb, uid, postId: id }) });
});

export const PATCH = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id } = await params;
  const input = await readJson(request);
  const { post, removedImageUrls } = await updatePost({ db: adminDb, uid, postId: id, input, cloudName: cloudName() });
  await destroyImages(removedImageUrls); // photos the author dropped while editing
  return Response.json({ post });
});

export const DELETE = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id } = await params;
  const { imageUrls } = await deletePost({ db: adminDb, uid, postId: id });
  await destroyImages(imageUrls);
  return Response.json({ deleted: true });
});
