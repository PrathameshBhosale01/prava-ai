"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import Reveal from "./Reveal";
import { PLANS } from "@/lib/plans";

export default function CTA() {
  return (
    <section className="px-5 py-24 sm:px-6 lg:py-28">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative isolate overflow-hidden rounded-3xl border border-[var(--l-line)] bg-[var(--l-raise)] px-6 py-16 text-center sm:px-14 sm:py-20">
          {/* Mesh + grid, layered so the band reads as its own surface. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_20%_0%,rgb(var(--l-glow)/0.2),transparent_65%),radial-gradient(55%_75%_at_85%_100%,rgb(139_92_246/0.16),transparent_65%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--l-dot)_1px,transparent_1px),linear-gradient(to_bottom,var(--l-dot)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000,transparent)]"
          />

          <h2 className="l-display mx-auto max-w-2xl text-[clamp(2.1rem,5vw,3.4rem)] text-[var(--l-ink)]">
            Somewhere you&apos;ve been meaning to go?
          </h2>

          <p className="l-lede mx-auto mt-5 max-w-lg text-[16.5px] text-[var(--l-ink-soft)]">
            Start with {PLANS.free.credits} free AI credits a month. No card, no trial countdown — just
            plan the trip and see if it holds up.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--l-ink)] px-7 text-[15px] font-medium text-[var(--l-canvas)] shadow-[var(--l-shadow-lift)] transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Create your first trip
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-[var(--l-line-strong)] px-7 text-[15px] font-medium text-[var(--l-ink)] transition-colors hover:border-[var(--l-brand)]/60 sm:w-auto"
            >
              Compare plans
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
