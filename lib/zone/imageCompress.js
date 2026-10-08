import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "./constants.js";
import { fitWithin } from "./composer.js";

// Browser-only. Phone photos are often 4–12 MB, which would blow the 5 MB upload cap.
// We downscale to 2000px on the long edge and re-encode, which typically lands at
// 300–900 KB with no visible loss on a blog page. Anything that goes wrong falls back
// to the original file, so compression can only ever help.

const MAX_EDGE = 2000;
const SKIP_BELOW_BYTES = 1.2 * 1024 * 1024;

export function checkImageFile(file) {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) return "Use a JPG, PNG, WebP or AVIF photo.";
  return "";
}

export function checkImageSize(file) {
  return file.size > MAX_UPLOAD_BYTES ? `Too large — photos must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` : "";
}

export async function prepareImage(file) {
  try {
    if (typeof createImageBitmap !== "function") return file;
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE);
    const needsResize = width < bitmap.width;
    if (!needsResize && file.size <= SKIP_BELOW_BYTES) {
      bitmap.close?.();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black as JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    // Prefer WebP; Safari silently returns PNG when it can't encode it, so check the result.
    let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp") blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.${ext}`, { type: blob.type });
  } catch {
    return file;
  }
}
