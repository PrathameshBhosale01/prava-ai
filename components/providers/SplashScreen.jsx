"use client";

import { useEffect, useState } from "react";

import BrandMark from "@/components/custom/BrandMark";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const MIN_MS = 1400; // shortest time the splash stays up, measured from page start
const MAX_MS = 4000; // never keep people waiting longer than this for slow loads
const FADE_MS = 400;

// Module state lives as long as the page does: a full load or refresh resets it,
// client-side navigation (e.g. clicking the logo back to "/") does not. So the
// splash shows once per page load, which is what we want.
let alreadyShown = false;

/**
 * Full-screen loading splash for the landing page.
 * It is part of the server-rendered HTML, so it covers the page from the very
 * first paint (no flash of the landing page). It hides after the page has loaded
 * AND MIN_MS has passed. Without JavaScript, a CSS fail-safe fades it out.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState(() => (alreadyShown ? "gone" : "show")); // show | hiding | gone

  useEffect(() => {
    if (alreadyShown) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const minimum = reduceMotion ? 400 : MIN_MS;
    const timers = [];
    let started = false;

    const hide = () => {
      if (started) return;
      started = true;

      // performance.now() counts from navigation start, so time already spent loading counts too.
      const wait = Math.max(0, minimum - performance.now());
      timers.push(
        setTimeout(() => {
          setPhase("hiding");
          timers.push(
            setTimeout(() => {
              // Mark as shown only once it has finished, so React Strict Mode's
              // double-run of effects in development can't cancel it half way.
              alreadyShown = true;
              setPhase("gone");
            }, reduceMotion ? 0 : FADE_MS)
          );
        }, wait)
      );
    };

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide, { once: true });
      timers.push(setTimeout(hide, Math.max(0, MAX_MS - performance.now())));
    }

    return () => {
      window.removeEventListener("load", hide);
      timers.forEach(clearTimeout);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${BRAND_NAME}`}
      className={cn(
        "splash-root fixed inset-0 z-[9999] grid bg-background text-foreground md:grid-cols-2",
        "transition-opacity ease-out",
        phase === "hiding" ? "pointer-events-none opacity-0 duration-[400ms]" : "opacity-100"
      )}
    >
      {/* Brand */}
      <div className="flex flex-col items-center justify-end gap-3 px-6 pb-8 pt-12 text-center md:justify-center md:border-r md:border-border md:py-12">
        <BrandMark
          size={88}
          className="h-16 w-auto motion-safe:animate-[splash-float_2.4s_ease-in-out_infinite] md:h-[88px]"
        />
        <p className="text-2xl font-bold tracking-tight">{BRAND_NAME}</p>
        <p className="text-xs text-muted-foreground">{BRAND_TAGLINE}</p>
      </div>

      {/* Progress */}
      <div className="flex flex-col justify-start px-8 pb-12 pt-8 md:justify-center md:px-16 md:py-12">
        <div className="mx-auto w-full max-w-xl text-center md:mx-0 md:text-left">
          <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">
            Loading your journey...
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Preparing your travel experience
          </p>
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-border" aria-hidden="true">
            <div
              className={cn(
                "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
                phase === "show" && "motion-safe:animate-[splash-fill_1.4s_cubic-bezier(0.22,1,0.36,1)_both]"
              )}
              style={{ width: phase === "show" ? "92%" : "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
