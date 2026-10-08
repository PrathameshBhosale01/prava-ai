import { CATEGORIES, LIMITS } from "./constants.js";
import { badRequest } from "./errors.js";
import { isAllowedImageUrl } from "./imageUrls.js";

/** lowercase, accent-free, single-spaced: "Café  Déjà" → "cafe deja" */
export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain-text teaser for cards: markdown punctuation stripped, cut on a word. */
export function makeExcerpt(content, max = 160) {
  const text = String(content ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → label
    .replace(/[#*_`>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function readingMinutes(content) {
  const words = String(content ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const clean = (value) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

/**
 * Title / body / category rules. Shared by the server (validatePostInput) and the
 * composer form, so the messages a writer sees are exactly what the API enforces.
 * Returns the cleaned values plus a { field: message } map (empty when valid).
 */
export function validateTextFields(input) {
  const fields = {};
  const body = input && typeof input === "object" ? input : {};

  const title = clean(body.title).replace(/\s+/g, " ").trim();
  if (title.length < LIMITS.title.min) fields.title = `Give your story a title (at least ${LIMITS.title.min} characters).`;
  else if (title.length > LIMITS.title.max) fields.title = `Keep the title under ${LIMITS.title.max} characters.`;

  const content = clean(body.content).trim();
  if (content.length < LIMITS.content.min) fields.content = `Tell us a bit more (at least ${LIMITS.content.min} characters).`;
  else if (content.length > LIMITS.content.max) fields.content = `That's too long — the limit is ${LIMITS.content.max} characters.`;

  const category = typeof body.category === "string" ? body.category : "";
  if (!CATEGORIES.includes(category)) fields.category = "Pick a category.";

  return { values: { title, content, category }, fields };
}

/**
 * Validates + normalises the body of POST/PATCH /posts.
 * Throws a 400 ZoneError carrying per-field messages the form can display.
 */
export function validatePostInput(input, { cloudName } = {}) {
  const body = input && typeof input === "object" ? input : {};
  const { values, fields } = validateTextFields(body);
  const { title, content, category } = values;

  const rawImages = body.imageUrls === undefined ? [] : body.imageUrls;
  let imageUrls = [];
  if (!Array.isArray(rawImages)) {
    fields.imageUrls = "Images must be a list.";
  } else {
    imageUrls = [...new Set(rawImages)];
    if (imageUrls.length > LIMITS.maxImages) fields.imageUrls = `You can attach up to ${LIMITS.maxImages} photos.`;
    else if (!imageUrls.every((url) => isAllowedImageUrl(url, cloudName))) fields.imageUrls = "One of the photos wasn't uploaded through the app.";
  }

  let coverIndex = body.coverIndex === undefined ? 0 : body.coverIndex;
  if (!Number.isInteger(coverIndex) || coverIndex < 0 || coverIndex >= Math.max(imageUrls.length, 1)) {
    if (!fields.imageUrls) fields.coverImage = "Cover photo must be one of the attached photos.";
    coverIndex = 0;
  }

  if (Object.keys(fields).length) throw badRequest("Please fix the highlighted fields.", fields);

  return { title, content, category, imageUrls, coverIndex };
}

export function validateCommentInput(input) {
  const text = clean(input?.text).trim();
  if (text.length < LIMITS.comment.min) throw badRequest("Write something first.", { text: "Write something first." });
  if (text.length > LIMITS.comment.max) {
    const message = `Comments are limited to ${LIMITS.comment.max} characters.`;
    throw badRequest(message, { text: message });
  }
  return text;
}
