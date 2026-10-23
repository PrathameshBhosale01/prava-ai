import { BRAND_COLORS } from "@/lib/brand";

/**
 * The Velmora mark: a V drawn as a route narrowing to a point, with the
 * destination dot above it.
 *
 * Inline SVG rather than an image file — it stays crisp at any size, costs no
 * network request, and the stroke colours stay editable.
 *
 * Decorative by default, because the wordmark beside it already carries the
 * name. Pass `title` only where the mark stands on its own.
 *
 * `tone="light"` draws it in white, for the coloured panels where the brand
 * purple would sink into the background.
 */
export default function BrandMark({ size = 28, className, title, tone = "brand" }) {
  const stroke = tone === "light" ? "#FFFFFF" : BRAND_COLORS.mark;
  const strokeSoft = tone === "light" ? "rgba(255,255,255,0.72)" : BRAND_COLORS.markSoft;

  return (
    <svg
      width={Math.round((size * 48) / 52)}
      height={size}
      viewBox="0 0 48 52"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M12 16 L24 44 L36 16"
        fill="none"
        stroke={stroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 30 L24 16.5 L30 30"
        fill="none"
        stroke={strokeSoft}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="12.5" r="2.2" fill={strokeSoft} />
    </svg>
  );
}
