"use client";

import {
  CalendarDays,
  Compass,
  LayoutDashboard,
  MapPin,
  MessageSquareText,
  Share2,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A miniature of the real trip page, drawn in markup rather than shipped as a
 * screenshot: it stays crisp at any size, follows the theme, and never goes out
 * of date the way an exported image would.
 *
 * Decorative as a whole — the surrounding section describes it — so the inner
 * text is hidden from assistive tech.
 */

const RAIL = [LayoutDashboard, Compass, MessageSquareText, CalendarDays, Wallet];

const DAYS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

const ACTIVITIES = [
  {
    time: "09:00",
    title: "Spice plantation tour",
    note: "Guided walk through a working plantation, lunch included.",
    place: "Ponda, Goa",
    rating: "4.6",
    cost: "₹1,200",
  },
  {
    time: "13:30",
    title: "Lunch at Gunpowder",
    note: "South Indian plates, shaded courtyard, easy pace.",
    place: "Assagao, Goa",
    rating: "4.5",
    cost: "₹900",
  },
];

export default function AppPreview({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "l-card overflow-hidden rounded-2xl shadow-[var(--l-shadow-lift)] select-none",
        className,
      )}
    >
      {/* window chrome */}
      <div className="flex items-center gap-1.5 border-b border-[var(--l-line)] bg-[var(--l-sunken)] px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--l-line-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--l-line-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--l-line-strong)]" />
        <span className="ml-3 truncate rounded-md border border-[var(--l-line)] bg-[var(--l-raise)] px-2.5 py-1 text-[10px] text-[var(--l-ink-soft)]">
          velmora.app / trips / mumbai–goa
        </span>
      </div>

      <div className="flex">
        {/* sidebar rail */}
        <div className="hidden w-12 shrink-0 flex-col items-center gap-4 border-r border-[var(--l-line)] bg-[var(--l-sunken)] py-4 sm:flex">
          <span className="h-5 w-5 rounded-md bg-gradient-to-br from-[var(--l-brand)] to-[var(--l-brand-2)]" />
          {RAIL.map((Icon, index) => (
            <Icon
              key={index}
              className={cn("h-4 w-4", index === 3 ? "text-[var(--l-brand)]" : "text-[var(--l-ink-soft)]/55")}
            />
          ))}
        </div>

        <div className="min-w-0 flex-1 p-3.5 sm:p-4">
          {/* trip banner */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[var(--l-brand)] to-[var(--l-brand-2)] px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">Mumbai → Goa</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/80">
                  <CalendarDays className="h-2.5 w-2.5" />
                  12–16 Dec · 5 days · 2 travellers
                </p>
              </div>
              <div className="hidden shrink-0 gap-1.5 sm:flex">
                <span className="rounded-md bg-white/15 px-2 py-1 text-[9.5px] font-medium text-white">Edit</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[9.5px] font-medium text-[var(--l-brand)]">
                  <Share2 className="h-2.5 w-2.5" />
                  Export
                </span>
              </div>
            </div>
          </div>

          {/* day tabs */}
          <div className="mt-3.5 flex gap-1.5 overflow-hidden">
            {DAYS.map((day, index) => (
              <span
                key={day}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium",
                  index === 0
                    ? "bg-[var(--l-ink)] text-[var(--l-canvas)]"
                    : "border border-[var(--l-line)] text-[var(--l-ink-soft)]",
                )}
              >
                {day}
              </span>
            ))}
          </div>

          <div className="mt-3.5 grid gap-3 lg:grid-cols-[1.45fr_1fr]">
            {/* activities */}
            <div className="space-y-2.5">
              {ACTIVITIES.map((item) => (
                <div key={item.title} className="rounded-xl border border-[var(--l-line)] bg-[var(--l-raise)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] font-semibold text-[var(--l-ink)]">{item.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[9.5px] font-medium text-[var(--l-brand)]">
                        {item.time}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5 text-[9.5px] text-[var(--l-ink-soft)]">
                      <Star className="h-2.5 w-2.5 fill-[var(--l-accent)] text-[var(--l-accent)]" />
                      {item.rating}
                    </span>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--l-ink-soft)]">{item.note}</p>

                  <div className="mt-2 flex items-center gap-2.5 text-[9.5px] text-[var(--l-ink-soft)]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      {item.place}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-2.5 w-2.5" />
                      {item.cost}
                    </span>
                  </div>
                </div>
              ))}

              {/* the Pro single-day tool, shown in place */}
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--l-line-strong)] bg-[var(--l-sunken)] px-3 py-2.5">
                <span className="flex-1 truncate text-[10px] text-[var(--l-ink-soft)]">
                  more food spots, fewer long walks
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--l-ink)] px-2 py-1 text-[9.5px] font-medium text-[var(--l-canvas)]">
                  <Sparkles className="h-2.5 w-2.5" />
                  Refine day
                </span>
              </div>
            </div>

            {/* side column */}
            <div className="hidden space-y-3 lg:block">
              <div className="rounded-xl border border-[var(--l-line)] bg-[var(--l-raise)] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-[var(--l-ink)]">Budget</p>
                  <p className="text-[9.5px] text-[var(--l-ink-soft)]">65%</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--l-sunken)]">
                  <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-[var(--l-brand)] to-[var(--l-brand-2)]" />
                </div>
                <p className="mt-1.5 text-[9.5px] text-[var(--l-ink-soft)]">₹31,200 of ₹48,000</p>

                <div className="mt-3 space-y-1.5 border-t border-[var(--l-line)] pt-2.5">
                  {[
                    ["Stays", "₹18,000"],
                    ["Food", "₹7,400"],
                    ["Activities", "₹5,800"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between text-[9.5px]">
                      <span className="text-[var(--l-ink-soft)]">{label}</span>
                      <span className="font-medium tabular-nums text-[var(--l-ink)]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--l-line)] bg-[var(--l-raise)] p-3">
                <p className="text-[10px] font-medium text-[var(--l-ink)]">Stay</p>
                <p className="mt-1 text-[9.5px] text-[var(--l-ink-soft)]">Anjuna Beach Resort</p>
                <div className="mt-2 flex gap-1">
                  {[
                    "from-[var(--l-brand-3)]/35 to-[var(--l-brand)]/25",
                    "from-[var(--l-accent)]/30 to-[var(--l-brand-2)]/25",
                    "from-[var(--l-brand-2)]/30 to-[var(--l-brand-3)]/25",
                  ].map((tint) => (
                    <span key={tint} className={cn("h-7 flex-1 rounded-md bg-gradient-to-br", tint)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
