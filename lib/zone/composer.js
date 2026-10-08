import { CATEGORIES, LIMITS } from "./constants.js";

// Pure helpers behind the story composer. No React, no DOM — see tests/zone/composer.test.mjs.

/* ------------------------- Markdown toolbar edits ------------------------- */

function wrap(text, start, end, before, after, placeholder) {
  const selected = text.slice(start, end) || placeholder;
  return {
    text: text.slice(0, start) + before + selected + after + text.slice(end),
    start: start + before.length,
    end: start + before.length + selected.length,
  };
}

// Prefixes every line touched by the selection; if they all have it already, removes it (toggle).
function prefixLines(text, start, end, prefix) {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const nl = text.indexOf("\n", end);
  const lineEnd = nl === -1 ? text.length : nl;
  const lines = text.slice(lineStart, lineEnd).split("\n");
  const allPrefixed = lines.every((l) => l.startsWith(prefix));
  const next = lines.map((l) => (allPrefixed ? l.slice(prefix.length) : l.startsWith(prefix) ? l : prefix + l)).join("\n");
  return { text: text.slice(0, lineStart) + next + text.slice(lineEnd), start: lineStart, end: lineStart + next.length };
}

/** kind: "bold" | "italic" | "heading" | "list" | "quote" | "link" → { text, start, end } (new text + selection) */
export function applyFormat(text, start, end, kind) {
  switch (kind) {
    case "bold":
      return wrap(text, start, end, "**", "**", "bold text");
    case "italic":
      return wrap(text, start, end, "*", "*", "italic text");
    case "link":
      return wrap(text, start, end, "[", "](https://)", "link text");
    case "heading":
      return prefixLines(text, start, end, "## ");
    case "list":
      return prefixLines(text, start, end, "- ");
    case "quote":
      return prefixLines(text, start, end, "> ");
    default:
      return { text, start, end };
  }
}

/* ------------------------------- photos ------------------------------- */

/** Returns a new array with the item at `from` moved to `to` (no-op when out of range). */
export function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Largest size that fits inside max×max, keeping aspect ratio and never upscaling. */
export function fitWithin(width, height, max) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/* ------------------------------ form state ------------------------------ */

export const emptyValues = { title: "", content: "", category: "" };

/**
 * Photos are { id, url, status: "uploading" | "done" | "error", ... }. Only finished
 * uploads are sent; the cover index is relative to that list (falls back to the first).
 */
export function buildPayload({ values, photos, coverId }) {
  const done = photos.filter((p) => p.status === "done");
  const coverIndex = Math.max(done.findIndex((p) => p.id === coverId), 0);
  return { title: values.title, content: values.content, category: values.category, imageUrls: done.map((p) => p.url), coverIndex };
}

/** Has anything changed compared with what was loaded (or with a blank form)? */
export function isDirty(current, initial) {
  const norm = (p) => JSON.stringify([p.title.trim(), p.content.trim(), p.category, p.imageUrls, p.coverIndex]);
  return norm(current) !== norm(initial);
}

/* ------------------------------- drafts ------------------------------- */

export const draftKey = (uid) => `zone-draft:${uid || "anon"}`;

/**
 * Parses a stored draft defensively: localStorage is user-editable and may hold an
 * old shape. Returns null unless it's usable AND non-empty.
 */
export function parseDraft(raw) {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return null;
    const values = {
      title: typeof d.title === "string" ? d.title.slice(0, LIMITS.title.max) : "",
      content: typeof d.content === "string" ? d.content.slice(0, LIMITS.content.max) : "",
      category: CATEGORIES.includes(d.category) ? d.category : "",
    };
    const imageUrls = Array.isArray(d.imageUrls) ? d.imageUrls.filter((u) => typeof u === "string").slice(0, LIMITS.maxImages) : [];
    const coverIndex = Number.isInteger(d.coverIndex) && d.coverIndex >= 0 && d.coverIndex < imageUrls.length ? d.coverIndex : 0;
    if (!values.title.trim() && !values.content.trim() && imageUrls.length === 0) return null;
    return { ...values, imageUrls, coverIndex };
  } catch {
    return null;
  }
}
