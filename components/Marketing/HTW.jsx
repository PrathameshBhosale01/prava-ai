"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import Reveal from "./Reveal";
import { planSteps } from "@/lib/landing";

export default function HTW() {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-20 overflow-hidden border-y border-[var(--l-line)] bg-[var(--l-sunken)] px-5 py-24 sm:px-6 lg:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Reveal>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--l-brand)]">How it works</p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="l-title mt-3 text-[clamp(2rem,4.4vw,3rem)] text-[var(--l-ink)]">
              Three steps between an idea and an itinerary.
            </h2>
          </Reveal>
        </div>

        <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-6">
          {/* The rail connecting the steps, desktop only. */}
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-[var(--l-line-strong)] to-transparent md:block"
          />

          {planSteps.map((step, index) => (
            <Reveal as="li" key={step.step} delay={index * 110} className="relative">
              <div className="flex items-center gap-3 md:block">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--l-line)] bg-[var(--l-raise)] text-[var(--l-brand)] shadow-[var(--l-shadow)]">
                  <step.icon className="h-[22px] w-[22px]" aria-hidden="true" />
                </span>
                <span className="font-mono text-[12px] font-medium tracking-[0.1em] text-[var(--l-ink-soft)] md:mt-5 md:block">
                  STEP {step.step}
                </span>
              </div>

              <h3 className="l-title mt-4 text-[20px] text-[var(--l-ink)]">{step.title}</h3>
              <p className="l-lede mt-2.5 max-w-sm text-[14.5px] text-[var(--l-ink-soft)]">{step.description}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={120} className="mt-14">
          <Link
            href="/signup"
            className="group inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--l-line-strong)] bg-[var(--l-raise)] px-5 text-[14.5px] font-medium text-[var(--l-ink)] transition-colors hover:border-[var(--l-brand)]/60"
          >
            Try it on your next trip
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
