import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/zone/constants";
import { isUploadConfigured, uploadImage } from "@/lib/zone/cloudinary";
import { badRequest, ZoneError } from "@/lib/zone/errors";
import { requireUser, route } from "@/lib/zone/http";

/** POST multipart/form-data { file } → { url, width, height }. Signed-in users only. */
export const POST = route(async (request) => {
  await requireUser(request);

  if (!isUploadConfigured()) {
    throw new ZoneError(503, "Photo uploads aren't set up yet.", { code: "uploads_unavailable" });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    throw badRequest("Send the photo as multipart form data.");
  }

  const file = form.get("file");
  if (!file || typeof file === "string") throw badRequest("No photo attached.");
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) throw badRequest("Use a JPG, PNG, WebP or AVIF photo.");
  if (file.size > MAX_UPLOAD_BYTES) throw badRequest(`Photos must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);

  const result = await uploadImage(Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: result.secure_url, width: result.width, height: result.height }, { status: 201 });
});
