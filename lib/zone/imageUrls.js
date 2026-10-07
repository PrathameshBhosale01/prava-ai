import { UPLOAD_FOLDER } from "./constants.js";

// Only images we uploaded ourselves may be attached to a post. Without this a
// user could hotlink arbitrary URLs (tracking pixels, offensive content, ...)
// straight into other people's feeds.

function parse(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function isAllowedImageUrl(url, cloudName) {
  if (typeof url !== "string" || !cloudName) return false;
  const parsed = parse(url);
  if (!parsed) return false;
  return (
    parsed.protocol === "https:" &&
    parsed.hostname === "res.cloudinary.com" &&
    parsed.pathname.startsWith(`/${cloudName}/image/upload/`) &&
    parsed.pathname.includes(`/${UPLOAD_FOLDER}/`)
  );
}

/**
 * "https://res.cloudinary.com/demo/image/upload/v123/prava-zone/abc.jpg"
 *   → "prava-zone/abc"
 * Returns "" for anything that isn't one of our uploads, so a bad URL can never
 * make us delete somebody else's asset.
 */
export function getPublicIdFromUrl(url, cloudName) {
  if (!isAllowedImageUrl(url, cloudName)) return "";
  const parsed = parse(url);
  const afterUpload = decodeURIComponent(parsed.pathname.split("/image/upload/")[1] || "");
  const segments = afterUpload.split("/").filter(Boolean);
  const start = segments.findIndex((s) => s === UPLOAD_FOLDER);
  if (start === -1) return "";
  const idSegments = segments.slice(start);
  idSegments[idSegments.length - 1] = idSegments[idSegments.length - 1].replace(/\.[^/.]+$/, "");
  return idSegments.join("/");
}
