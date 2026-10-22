import { BadgeCheck } from "lucide-react";

/** Small tick next to a Pro writer's name. Renders nothing for everyone else. */
export default function VerifiedBadge({ show }) {
  if (!show) return null;
  return (
    <span title="Verified creator" className="ml-1 inline-flex align-middle text-info">
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">Verified creator</span>
    </span>
  );
}
