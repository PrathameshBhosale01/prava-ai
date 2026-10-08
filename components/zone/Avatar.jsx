"use client";

import { useState } from "react";

import { initials } from "@/lib/zone/format";
import { cn } from "@/lib/utils";

/** Profile photo with an initials fallback (missing URL or failed load). */
export default function Avatar({ name, src, className }) {
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-[11px] font-semibold text-primary",
        className,
      )}
    >
      {showImage ? (
        // Plain <img>: avatars come from arbitrary identity providers (Google, GitHub…)
        // so there's no fixed host to whitelist for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
