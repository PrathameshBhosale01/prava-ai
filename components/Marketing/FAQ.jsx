"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import Reveal from "./Reveal";
import { faqs } from "@/lib/landing";
import { cn } from "@/lib/utils";

export default function FAQ() {
  // Accordion rather than <details>, so only one answer is open at a time.
  const [open, setOpen] = useState(0);

  return (
    <section
      id="faq"
      className="relative scroll-mt-20 border-y border-[var(--l-line)] bg-[var(--l-sunken)] px-5 py-24 sm:px-6 lg:py-32"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <Reveal>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--l-brand)]">FAQ</p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="l-title mt-3 text-[clamp(2rem,4vw,2.75rem)] text-[var(--l-ink)]">
              Questions, answered.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="l-lede mt-4 text-[15.5px] text-[var(--l-ink-soft)]">
              Still unsure about something?{" "}
              <Link href="/#contact" className="font-medium text-[var(--l-brand)] underline-offset-4 hover:underline">
                Get in touch
              </Link>{" "}
              and I&apos;ll answer it myself.
            </p>
          </Reveal>
        </div>

        <div className="divide-y divide-[var(--l-line)] border-y border-[var(--l-line)]">
          {faqs.map((item, index) => {
            const expanded = open === index;
            return (
              <Reveal key={item.q} delay={index * 60}>
                <h3>
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? -1 : index)}
                    aria-expanded={expanded}
                    aria-controls={`faq-panel-${index}`}
                    className="flex w-full cursor-pointer items-start justify-between gap-6 py-5 text-left"
                  >
                    <span
                      className={cn(
                        "text-[16px] font-medium transition-colors",
                        expanded ? "text-[var(--l-brand)]" : "text-[var(--l-ink)]",
                      )}
                    >
                      {item.q}
                    </span>
                    <Plus
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0 text-[var(--l-ink-soft)] transition-transform duration-300",
                        expanded && "rotate-45 text-[var(--l-brand)]",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </h3>

                <div
                  id={`faq-panel-${index}`}
                  hidden={!expanded}
                  className="l-lede pb-5 pr-10 text-[14.5px] text-[var(--l-ink-soft)]"
                >
                  {item.a}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
