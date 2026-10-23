"use client";

import Reveal from "./Reveal";
import { services } from "@/lib/landing";
import { cn } from "@/lib/utils";

const ACCENTS = {
  brand: "text-[var(--l-brand)] bg-[var(--l-brand)]/10",
  violet: "text-[var(--l-brand-2)] bg-[var(--l-brand-2)]/10",
  cyan: "text-[var(--l-brand-3)] bg-[var(--l-brand-3)]/12",
  amber: "text-[var(--l-accent)] bg-[var(--l-accent)]/12",
};

/** Moves the card's sheen to follow the cursor. */
function trackPointer(event) {
  const bounds = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
  event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
}

export default function Features() {
  return (
    <section id="features" className="relative scroll-mt-20 px-5 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Reveal>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--l-brand)]">Features</p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="l-title mt-3 text-[clamp(2rem,4.4vw,3rem)] text-[var(--l-ink)]">
              Everything the planning spreadsheet was doing, done properly.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="l-lede mt-4 text-[16px] text-[var(--l-ink-soft)]">
              Prava handles the whole arc of a trip: the first idea, the day-by-day plan, the money and
              the version you actually carry with you.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Reveal
              key={service.title}
              delay={index * 70}
              className={cn(service.span === "wide" && "lg:col-span-2")}
            >
              <article
                onPointerMove={trackPointer}
                className="l-card l-spot group h-full rounded-2xl p-6 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-[var(--l-brand)]/40 hover:shadow-[var(--l-shadow-lift)]"
              >
                <div className="relative z-10 flex h-full flex-col">
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
                      ACCENTS[service.accent],
                    )}
                  >
                    <service.icon className="h-[22px] w-[22px]" aria-hidden="true" />
                  </span>

                  <div className="mt-auto pt-10">
                    <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--l-ink)]">
                      {service.title}
                    </h3>
                    <p className="l-lede mt-2 max-w-md text-[14.5px] text-[var(--l-ink-soft)]">
                      {service.description}
                    </p>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
