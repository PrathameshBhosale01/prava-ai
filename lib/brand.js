// The product's name, in one place. Everything user-facing reads from here, so
// a rename is this file plus the public asset files — not a sweep of the tree.

export const BRAND_NAME = "Velmora";

/** For titles, prompts and copy that need the longer form. */
export const BRAND_FULL = "Velmora AI";

export const BRAND_TAGLINE = "Plan • Explore • Travel Smart";

/** The mark's colours, mirrored by `--brand-mark-*` so CSS can use them too. */
export const BRAND_COLORS = { mark: "#7C5CFF", markSoft: "#A892FF" };

/** `Trips | Velmora` — one shape for every page title. */
export function pageTitle(page) {
  return page ? `${page} | ${BRAND_NAME}` : BRAND_NAME;
}
