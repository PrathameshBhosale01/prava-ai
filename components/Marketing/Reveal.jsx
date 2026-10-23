"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Reveals its children once they scroll into view, then stops watching.
 *
 * One IntersectionObserver per element is cheaper here than a motion library
 * for the dozens of elements on this page. The hidden state lives in CSS and is
 * cancelled by a <noscript> rule on the page, so with scripting off everything
 * renders visible instead of staying blank.
 *
 * @param as     the tag to render (default "div")
 * @param delay  stagger in ms, applied as a CSS transition-delay
 */
export default function Reveal({ as: Tag = "div", delay = 0, className, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === "undefined") {
      node.dataset.shown = "true"; // very old browser: just show it
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown={shown ? "true" : "false"}
      style={delay ? { "--reveal-delay": `${delay}ms` } : undefined}
      className={cn("l-reveal", className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
