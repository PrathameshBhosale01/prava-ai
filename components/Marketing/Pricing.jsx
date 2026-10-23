"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import Reveal from "./Reveal";
import { pricingPlans, yearlyDiscountPercent } from "@/lib/landing";
import { cn } from "@/lib/utils";

export default function Pricing() {
  const [yearly, setYearly] = useState(true);

  return (
    <section id="pricing" className="relative scroll-mt-20 px-5 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--l-brand)]">Pricing</p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="l-title mt-3 text-[clamp(2rem,4.4vw,3rem)] text-[var(--l-ink)]">
              Start free. Upgrade when you travel more.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="l-lede mx-auto mt-4 max-w-lg text-[16px] text-[var(--l-ink-soft)]">
              Both plans include the full itinerary builder. Pro raises the limits and unlocks the
              tools for reshaping and exporting a trip.
            </p>
          </Reveal>

          <Reveal delay={180} className="mt-8 flex justify-center">
            <div
              role="radiogroup"
              aria-label="Billing period"
              className="inline-flex rounded-xl border border-[var(--l-line)] bg-[var(--l-raise)] p-1"
            >
              {[
                { id: "monthly", label: "Monthly", on: !yearly },
                { id: "yearly", label: "Yearly", on: yearly },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={option.on}
                  onClick={() => setYearly(option.id === "yearly")}
                  className={cn(
                    "cursor-pointer rounded-lg px-4 py-2 text-[13.5px] font-medium transition-colors",
                    option.on
                      ? "bg-[var(--l-ink)] text-[var(--l-canvas)]"
                      : "text-[var(--l-ink-soft)] hover:text-[var(--l-ink)]",
                  )}
                >
                  {option.label}
                  {option.id === "yearly" && (
                    <span
                      className={cn(
                        "ml-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
                        option.on ? "bg-white/15 text-white" : "bg-[var(--l-brand)]/12 text-[var(--l-brand)]",
                      )}
                    >
                      −{yearlyDiscountPercent}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {pricingPlans.map((plan, index) => (
            <Reveal key={plan.id} delay={index * 100} className="h-full">
              <article
                className={cn(
                  "relative flex h-full flex-col overflow-hidden rounded-2xl p-7 sm:p-8",
                  plan.featured
                    ? "border border-[var(--l-brand)]/45 bg-[var(--l-raise)] shadow-[var(--l-shadow-lift)]"
                    : "l-card",
                )}
              >
                {plan.featured && (
                  <>
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--l-brand)] to-transparent"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[var(--l-brand)]/12 blur-3xl"
                    />
                    <span className="absolute right-6 top-7 rounded-full bg-[var(--l-brand)] px-2.5 py-1 text-[11px] font-semibold text-white">
                      Most popular
                    </span>
                  </>
                )}

                <div className="relative flex flex-1 flex-col">
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl",
                      plan.featured
                        ? "bg-[var(--l-brand)]/12 text-[var(--l-brand)]"
                        : "bg-[var(--l-sunken)] text-[var(--l-ink-soft)]",
                    )}
                  >
                    <plan.icon className="h-[22px] w-[22px]" aria-hidden="true" />
                  </span>

                  <h3 className="l-title mt-5 text-[22px] text-[var(--l-ink)]">{plan.title}</h3>
                  <p className="mt-1.5 text-[14px] text-[var(--l-ink-soft)]">{plan.tagline}</p>

                  <div className="mt-7 flex items-baseline gap-1.5">
                    <span className="l-display text-[44px] text-[var(--l-ink)]">
                      {yearly ? plan.priceYearly : plan.priceMonthly}
                    </span>
                    {plan.id !== "free" && <span className="text-[14px] text-[var(--l-ink-soft)]">/mo</span>}
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-[var(--l-ink-soft)]">
                    {yearly ? plan.noteYearly : plan.noteMonthly}
                  </p>

                  <Link
                    href={plan.href}
                    className={cn(
                      "group mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14.5px] font-medium transition-all",
                      plan.featured
                        ? "bg-[var(--l-ink)] text-[var(--l-canvas)] hover:-translate-y-0.5 hover:shadow-[var(--l-shadow-lift)]"
                        : "border border-[var(--l-line-strong)] text-[var(--l-ink)] hover:border-[var(--l-brand)]/60",
                    )}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>

                  <ul className="mt-7 flex-1 space-y-3 border-t border-[var(--l-line)] pt-7">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2.5 text-[14px] text-[var(--l-ink)]">
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            plan.featured ? "text-[var(--l-brand)]" : "text-[var(--l-ink-soft)]",
                          )}
                          aria-hidden="true"
                        />
                        <span className="l-lede text-[var(--l-ink-soft)]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={160}>
          <p className="mt-8 text-center text-[13px] text-[var(--l-ink-soft)]">
            Prices in INR. Cancel anytime from your subscription page — you keep Pro until the period you
            paid for ends.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
