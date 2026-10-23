"use client";

import Link from "next/link";
import { ArrowRight, Clock, Compass, MapPin, Sparkles } from "lucide-react";

import AppPreview from "./AppPreview";
import Reveal from "./Reveal";
import { heroStats, popularRoutes, sampleTrip } from "@/lib/landing";

/** The itinerary preview floating beside the hero: a shape of the real product. */
function PlanPreview() {
  return (
    <div className="l-card l-edge w-full overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--l-line)] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[var(--l-ink)]">{sampleTrip.route}</p>
          <p className="truncate text-[11px] text-[var(--l-ink-soft)]">{sampleTrip.meta}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--l-brand)]/10 px-2 py-1 text-[10px] font-medium text-[var(--l-brand)]">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          AI plan
        </span>
      </div>

      <div className="space-y-4 p-4">
        {sampleTrip.days.map((day) => (
          <div key={day.day}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-[11px] font-semibold text-[var(--l-ink)]">{day.day}</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--l-ink-soft)]">
                <MapPin className="h-2.5 w-2.5" aria-hidden="true" />
                {day.city}
              </span>
            </div>

            <ul className="space-y-1.5">
              {day.items.map((item) => (
                <li key={item.title} className="flex gap-2.5 rounded-lg bg-[var(--l-sunken)] px-2.5 py-2">
                  <span className="pt-px text-[10px] font-medium tabular-nums text-[var(--l-brand)]">{item.time}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11.5px] font-medium text-[var(--l-ink)]">{item.title}</span>
                    <span className="block truncate text-[10px] text-[var(--l-ink-soft)]">{item.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="home" className="l-dotgrid l-aurora relative isolate overflow-hidden px-5 pb-20 pt-14 sm:px-6 sm:pt-20 lg:pb-28">
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Link
              href="/#pricing"
              className="group inline-flex items-center gap-2 rounded-full border border-[var(--l-line-strong)] bg-[var(--l-raise)] py-1 pl-1 pr-3 text-[12.5px] text-[var(--l-ink-soft)] shadow-[var(--l-shadow)] transition-colors hover:border-[var(--l-brand)]/50"
            >
              <span className="rounded-full bg-[var(--l-brand)] px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
              <span className="sm:hidden">Pro: regenerate a single day</span>
              <span className="hidden sm:inline">Pro adds single-day regenerate &amp; calendar export</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </Reveal>

          <Reveal delay={60}>
            <h1 className="l-display mt-7 text-[clamp(2.6rem,7.2vw,4.75rem)] text-[var(--l-ink)]">
              Your next trip,
              <br />
              <span className="l-gradient-text">planned in a minute.</span>
            </h1>
          </Reveal>

          <Reveal delay={120}>
            <p className="l-lede mx-auto mt-6 max-w-xl text-[16.5px] text-[var(--l-ink-soft)] sm:text-[17.5px]">
              Describe the trip you want. Prava builds the full day-by-day itinerary — real places, honest
              timings, stays and a budget that adds up — then lets you reshape any part of it.
            </p>
          </Reveal>

          <Reveal delay={180} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--l-ink)] px-6 text-[15px] font-medium text-[var(--l-canvas)] shadow-[var(--l-shadow-lift)] transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              Start planning free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/discover"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--l-line-strong)] bg-[var(--l-raise)] px-6 text-[15px] font-medium text-[var(--l-ink)] transition-colors hover:border-[var(--l-brand)]/60 sm:w-auto"
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              Explore destinations
            </Link>
          </Reveal>

          <Reveal delay={240}>
            <p className="mt-4 text-[12.5px] text-[var(--l-ink-soft)]">
              No card required · {heroStats[0].value} AI credits free every month
            </p>
          </Reveal>
        </div>

        {/* Product shot: the real trip page, drawn in markup. The small cards
            float at its edges on xl, where there is room beside it. */}
        <Reveal delay={260} className="relative mt-16 sm:mt-20 xl:-mx-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-[min(90%,52rem)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(var(--l-glow)/0.26),transparent)] blur-2xl"
          />

          <AppPreview className="mx-auto hidden max-w-4xl md:block" />

          {/* On phones the full app view would be unreadable, so show the plan alone. */}
          <div className="mx-auto max-w-sm md:hidden">
            <PlanPreview />
          </div>

          <div className="l-float pointer-events-none absolute -left-3 top-24 hidden w-56 xl:block">
            <PlanPreview />
          </div>

          <div
            className="l-float pointer-events-none absolute -right-3 bottom-10 hidden w-56 xl:block"
            style={{ animationDelay: "1.4s" }}
          >
            <div className="l-card l-edge rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--l-brand)]/12 text-[var(--l-brand)]">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] text-[var(--l-ink-soft)]">AI credits left</p>
                  <p className="text-[13px] font-semibold text-[var(--l-ink)]">24 of 30 this month</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--l-sunken)]">
                <div className="h-full w-[80%] rounded-full bg-gradient-to-r from-[var(--l-brand)] to-[var(--l-brand-2)]" />
              </div>
              <p className="mt-2.5 flex items-center gap-1 text-[10.5px] text-[var(--l-ink-soft)]">
                <Clock className="h-3 w-3" aria-hidden="true" />
                Resets on the 1st
              </p>
            </div>
          </div>
        </Reveal>

        {/* Stats */}
        <Reveal delay={120} className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--l-line)] bg-[var(--l-line)] sm:grid-cols-3">
          {heroStats.map((stat) => (
            <div key={stat.label} className="bg-[var(--l-canvas)] px-5 py-6 text-center">
              <p className="l-title text-[26px] text-[var(--l-ink)]">{stat.value}</p>
              <p className="mt-1 text-[12.5px] text-[var(--l-ink-soft)]">{stat.label}</p>
            </div>
          ))}
        </Reveal>

        {/* Routes marquee */}
        <div className="l-fade-x mt-14 overflow-hidden">
          <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--l-ink-soft)]">
            Popular routes planned with Prava
          </p>
          <div className="flex w-max">
            <ul className="l-marquee flex shrink-0 items-center gap-3 pr-3" aria-label="Popular routes">
              {[...popularRoutes, ...popularRoutes].map((route, index) => (
                <li
                  key={`${route}-${index}`}
                  aria-hidden={index >= popularRoutes.length ? "true" : undefined}
                  className="whitespace-nowrap rounded-full border border-[var(--l-line)] bg-[var(--l-raise)] px-4 py-2 text-[13px] text-[var(--l-ink-soft)]"
                >
                  {route}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
