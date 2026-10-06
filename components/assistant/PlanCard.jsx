"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";

function formatMoney(amount, currency) {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function formatDate(key) {
  const date = new Date(`${key}T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-surface/80 px-3 py-2 ring-1 ring-border">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon size={12} />
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function DayRow({ day, open, onToggle }) {
  const panelId = `plan-day-${day.day}`;

  return (
    <li className="overflow-hidden rounded-xl border border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 bg-surface-muted/70 px-4 py-3 text-left transition hover:bg-surface-muted"
      >
         <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {day.day}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{day.title}</span>
        {day.date && <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{formatDate(day.date)}</span>}
        <ChevronDown size={16} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <ul className="divide-y divide-border px-4">
              {day.activities.map((activity, index) => (
                <li key={index} className="flex gap-4 py-3">
                  <span className="w-12 shrink-0 pt-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                    {activity.time}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    {activity.description && (
                      <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{activity.description}</p>
                    )}
                    {activity.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin size={11} />
                        {activity.location}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Preview of a generated trip with a one-click save to My Trips. */
export default function PlanCard({ plan, saving, error, onSave }) {
  const { trip, itinerary, tripId } = plan;
  const [openDay, setOpenDay] = useState(itinerary.days[0]?.day ?? null);

  return (
    <section
      aria-label={`Trip plan: ${trip.title}`}
       className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-card"
    >
      <header className="border-b border-border bg-linear-to-br from-primary-soft via-surface to-surface px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary shadow-card ring-1 ring-border">
            <MapPin size={18} />
          </span>
          <div className="min-w-0">
             <h3 className="truncate text-base font-semibold text-foreground">{trip.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <span>{trip.startingFrom}</span>
              <ArrowRight size={13} className="shrink-0" />
              <span>{trip.destination}</span>
            </p>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat icon={CalendarDays} label="Duration" value={`${trip.duration} ${trip.duration === 1 ? "day" : "days"}`} />
          <Stat icon={Users} label="Travelers" value={trip.travelers} />
          <Stat icon={Wallet} label="Budget" value={formatMoney(trip.budget, trip.currency)} />
          <Stat icon={CalendarDays} label="Starts" value={formatDate(trip.startDate)} />
        </dl>
      </header>

      <div className="px-5 py-4">
        {itinerary.summary && <p className="text-sm leading-6 text-muted-foreground">{itinerary.summary}</p>}

        <ol className="mt-4 space-y-2">
          {itinerary.days.map((day) => (
            <DayRow
              key={day.day}
              day={day}
              open={openDay === day.day}
              onToggle={() => setOpenDay(openDay === day.day ? null : day.day)}
            />
          ))}
        </ol>
      </div>

       <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-muted/60 px-5 py-3">
        <p className="text-xs text-muted-foreground">AI-generated estimates. Verify prices and bookings.</p>

        {tripId ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <Check size={16} />
              Saved to My Trips
            </span>
            <Link
              href={`/trips/${tripId}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
            >
              View trip
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Bookmark size={15} />}
            {saving ? "Saving…" : "Save to My Trips"}
          </button>
        )}
      </footer>

      {error && (
        <p role="alert" className="flex items-center gap-2 border-t border-danger/30 bg-danger-soft px-5 py-2.5 text-sm text-danger">
          <CircleAlert size={15} className="shrink-0" />
          {error}
        </p>
      )}
    </section>
  );
}

/** Placeholder shown while the itinerary is being generated. */
export function PlanBuilding() {
  return (
     <div role="status" className="mt-4 rounded-2xl border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center gap-3">
        <LoaderCircle size={18} className="animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Building your itinerary…</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Putting together a day-by-day plan. This can take up to half a minute.</p>
 

      <div className="mt-4 space-y-2" aria-hidden="true">
        {[0, 1, 2].map((index) => (
           <div key={index} className="h-10 animate-pulse rounded-xl bg-surface-muted" style={{ animationDelay: `${index * 150}ms` }} />
        ))}
      </div>
    </div>
  );
}