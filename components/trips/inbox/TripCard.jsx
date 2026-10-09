"use client";

import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  Plane,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  STATUS_LABELS,
  daysUntil,
  formatBudget,
  formatDate,
  formatDuration,
  formatTravelers,
} from "@/lib/tripInbox";
import { cn } from "@/lib/utils";

// Static class names so Tailwind can detect them.
const STATUS_TONES = {
  upcoming: "bg-info-soft text-info",
  ongoing: "bg-success-soft text-success",
  completed: "bg-surface-muted text-muted-foreground",
  unscheduled: "bg-warning-soft text-warning",
};

const MAX_INTERESTS = 4;

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-semibold text-foreground">{value}</dd>
      </div>
    </div>
  );
}

export default function TripCard({ trip, onDelete }) {
  const extra = trip.interests.length - MAX_INTERESTS;
  const countdown = trip.status === "upcoming" ? daysUntil(trip.startDate) : null;

  return (
    <Card className="group relative overflow-hidden transition-shadow duration-200 focus-within:ring-2 focus-within:ring-primary/40 hover:shadow-pop">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-info to-success"
      />

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Plane className="h-6 w-6" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {/* Stretched link: the whole card is clickable, one tab stop. */}
              <Link
                href={`/trips/${trip.id}`}
                className="outline-none after:absolute after:inset-0 after:content-['']"
              >
                {trip.title}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{trip.destination}</span>
            </p>
            {trip.startingFrom && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                From {trip.startingFrom}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                STATUS_TONES[trip.status]
              )}
            >
              {countdown
                ? `In ${countdown} ${countdown === 1 ? "day" : "days"}`
                : STATUS_LABELS[trip.status]}
            </span>
            {trip.hasItinerary && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Itinerary ready
              </span>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Stat icon={CalendarDays} label="Starts" value={formatDate(trip.startDate)} />
          <Stat icon={Wallet} label="Budget" value={formatBudget(trip.budget, trip.currency)} />
          <Stat icon={Clock} label="Duration" value={formatDuration(trip.days)} />
          <Stat icon={Users} label="Travelers" value={formatTravelers(trip.travelers)} />
        </dl>

        {(trip.category || trip.interests.length > 0) && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Trip tags">
            {trip.category && (
              <li className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">
                {trip.category}
              </li>
            )}
            {trip.interests.slice(0, MAX_INTERESTS).map((interest) => (
              <li
                key={interest}
                className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {interest}
              </li>
            ))}
            {extra > 0 && (
              <li className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                +{extra} more
              </li>
            )}
          </ul>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">
            Saved {formatDate(trip.createdAt)}
          </span>

          <div className="relative z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onDelete(trip)}
              aria-label={`Delete ${trip.title}`}
              className={buttonVariants({ variant: "ghost", size: "icon", className: "hover:text-danger" })}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link
              href={`/trips/${trip.id}`}
              tabIndex={-1}
              aria-hidden="true"
              className={buttonVariants({ size: "md" })}
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
