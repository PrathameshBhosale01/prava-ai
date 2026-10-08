// Small pure helpers for rendering posts. No React, no DOM.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * "just now" · "5m ago" · "3h ago" · "2d ago" · "Jul 9" · "Jul 9, 2025"
 * Takes `now` so it's deterministic in tests.
 */
export function formatPostDate(iso, now = new Date()) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";

  const diff = now.getTime() - date.getTime();
  if (diff < MIN) return "just now"; // also covers small clock skew (future dates)
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "Ana Café" → "AC", "raj" → "R", "" → "?" */
export function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0][0] : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

/** 1 → "1 comment", 0 → "0 comments" */
export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
