"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/lib/utils";

/** Big photo + thumbnail strip. Thumbnails are real buttons, so it works with keyboard and screen readers. */
export default function PostGallery({ images, title, startUrl }) {
  const [index, setIndex] = useState(Math.max(images.indexOf(startUrl), 0));
  if (images.length === 0) return null;

  return (
    <figure className="space-y-3">
      <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-surface-muted">
        <Image
          key={images[index]}
          src={images[index]}
          alt={`${title} — photo ${index + 1} of ${images.length}`}
          fill
          priority
          sizes="(min-width: 1024px) 768px, 100vw"
          className="object-cover"
        />
        {images.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur" aria-hidden="true">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Photos">
          {images.map((url, i) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className={cn(
                  "relative block h-16 w-24 cursor-pointer overflow-hidden rounded-lg border-2 transition-all",
                  i === index ? "border-primary" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image src={url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
