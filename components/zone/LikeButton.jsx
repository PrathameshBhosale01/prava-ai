import { Heart } from "lucide-react";

import { cn } from "@/lib/utils";

export default function LikeButton({ liked, count, onToggle, className }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? `Unlike (${count} likes)` : `Like (${count} likes)`}
      className={cn(
        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors active:scale-95",
        liked ? "bg-danger-soft text-danger" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4 transition-transform", liked && "scale-110 fill-current")} aria-hidden="true" />
      <span aria-hidden="true" className="tabular-nums">
        {count}
      </span>
    </button>
  );
}
