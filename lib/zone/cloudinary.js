import { v2 as cloudinary } from "cloudinary";

import { UPLOAD_FOLDER } from "./constants.js";
import { getPublicIdFromUrl } from "./imageUrls.js";

// Configured lazily so `next build` and routes that never touch images work
// even when the Cloudinary env vars aren't set.
function client() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return null;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export const isUploadConfigured = () => client() !== null;

export function uploadImage(buffer) {
  const c = client();
  if (!c) return Promise.reject(new Error("Cloudinary is not configured"));
  return new Promise((resolve, reject) => {
    c.uploader
      .upload_stream(
        { folder: UPLOAD_FOLDER, resource_type: "image", allowed_formats: ["jpg", "jpeg", "png", "webp", "avif"] },
        (error, result) => (error ? reject(error) : resolve(result)),
      )
      .end(buffer);
  });
}

/** Best-effort cleanup: a failure here must never fail the user's request. */
export async function destroyImages(urls = []) {
  const c = client();
  if (!c) return;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const publicIds = urls.map((url) => getPublicIdFromUrl(url, cloudName)).filter(Boolean);
  await Promise.allSettled(publicIds.map((id) => c.uploader.destroy(id, { resource_type: "image", invalidate: true })));
}
