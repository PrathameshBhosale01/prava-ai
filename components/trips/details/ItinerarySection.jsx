"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, Compass, ExternalLink, Hourglass, Navigation, Route, Star, Sun, Wallet } from "lucide-react";

import { activityLinks } from "@/lib/tripDetails";
import { cn } from "@/lib/utils";

import SectionCard from "./SectionCard";

function Detail({ icon: Icon, label, children }) {
  return (
    <li className="flex items-start gap-2 text-xs text-muted-foreground">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium text-foreground/80">{label}: </span>
        {children}
      </span>
    </li>
  );
}

const linkClass = "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors";

function ActivityCard({ activity, trip }) {
  const links = activityLinks(activity, trip);
  const details = [
    [Wallet, "Price", activity.price],
    [Hourglass, "Duration", activity.duration],
    [Sun, "Best time", activity.bestTime],
    [Route, "Getting there", activity.travel],
  ].filter(([, , value]) => value);

  return (
    <li className="flex break-inside-avoid flex-col rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-base font-semibold leading-snug text-foreground">{activity.title}</h4>
          {activity.time && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {activity.time}
            </p>
          )}
        </div>
        {activity.rating != null && (
          <p className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
            <span>
              <span className="sr-only">Approximate rating: </span>
              {activity.rating}
            </span>
          </p>
        )}
      </div>

      {activity.description && <p className="mt-2 text-sm leading-relaxed text-foreground/85">{activity.description}</p>}
      {activity.location && <p className="mt-2 text-xs text-muted-foreground">📍 {activity.location}</p>}

      {details.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {details.map(([icon, label, value]) => (
            <Detail key={label} icon={icon} label={label}>
              {value}
            </Detail>
          ))}
        </ul>
      )}

      <ul className="mt-auto flex flex-wrap gap-1.5 pt-4 print:hidden">
        <li>
          <a href={links.maps} target="_blank" rel="noopener noreferrer" aria-label={`${activity.title} on Maps (opens in a new tab)`} className={cn(linkClass, "bg-slate-800 text-white hover:bg-slate-900")}>
            Maps
          </a>
        </li>
        <li>
          <a href={links.directions} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${activity.title} (opens in a new tab)`} className={cn(linkClass, "bg-blue-600 text-white hover:bg-blue-700")}>
            <Navigation className="h-3 w-3" aria-hidden="true" />
            Directions
          </a>
        </li>
        <li>
          <a href={links.explore} target="_blank" rel="noopener noreferrer" aria-label={`Explore ${activity.title} (opens in a new tab)`} className={cn(linkClass, "bg-emerald-600 text-white hover:bg-emerald-700")}>
            <Compass className="h-3 w-3" aria-hidden="true" />
            Explore
            <ExternalLink className="h-3 w-3 opacity-80" aria-hidden="true" />
          </a>
        </li>
      </ul>
    </li>
  );
}

/**
 * Day tabs + the selected day's activities. Follows the WAI-ARIA tabs pattern: only the active
 * tab is in the Tab order, Arrow keys / Home / End move between days. For printing, every
 * day's panel is shown (print:block) so the PDF contains the whole itinerary.
 */
export default function ItinerarySection({ days, trip }) {
  const [active, setActive] = useState(0);
  const tabRefs = useRef([]);
  const last = days.length - 1;

  function go(index) {
    const next = Math.min(Math.max(index, 0), last);
    setActive(next);
    tabRefs.current[next]?.focus();
    tabRefs.current[next]?.scrollIntoView?.({ block: "nearest", inline: "center" });
  }

  function onKeyDown(e) {
    const moves = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: last };
    if (!(e.key in moves)) return;
    e.preventDefault();
    go(moves[e.key]);
  }

  return (
    <SectionCard id="trip-itinerary" icon={Route} title="Day-by-day itinerary" tone="info">
      <div className="flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => go(active - 1)}
          disabled={active === 0}
          aria-label="Previous day"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <div role="tablist" aria-label="Itinerary days" onKeyDown={onKeyDown} className="flex flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {days.map((day, i) => (
            <button
              key={day.day}
              ref={(node) => (tabRefs.current[i] = node)}
              type="button"
              role="tab"
              id={`day-tab-${i}`}
              aria-label={`Day ${day.day}${day.dateLabel ? `, ${day.dateLabel}` : ""}`}
              aria-selected={i === active}
              aria-controls={`day-panel-${i}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full border px-4 py-1.5 text-left text-xs font-medium transition-colors",
                i === active ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span className="block font-semibold">Day {day.day}</span>
              {day.dateLabel && <span className={cn("block text-[11px] font-normal", i === active ? "text-primary-foreground/85" : "text-muted-foreground")}>{day.dateLabel}</span>}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(active + 1)}
          disabled={active === last}
          aria-label="Next day"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {days.map((day, i) => (
        <div key={day.day} role="tabpanel" id={`day-panel-${i}`} aria-labelledby={`day-tab-${i}`} hidden={i !== active} className="mt-5 print:mt-6 print:!block">
          <h3 className="rounded-xl bg-info-soft px-4 py-3 text-center text-lg font-semibold text-info">
            Day {day.day} · {day.title}
            {day.dateLabel && <span className="ml-2 text-sm font-normal text-info/80">{day.dateLabel}</span>}
          </h3>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {day.activities.map((activity, index) => (
              <ActivityCard key={`${activity.time}-${activity.title}-${index}`} activity={activity} trip={trip} />
            ))}
          </ul>
        </div>
      ))}
    </SectionCard>
  );
}
