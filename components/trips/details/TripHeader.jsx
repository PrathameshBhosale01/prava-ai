import { CalendarDays, MapPin, Navigation, Tag, Users, Wallet } from "lucide-react";

import { formatDateRange, formatMoney, tripEndDate } from "@/lib/tripDetails";

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="rounded-xl bg-white/15 px-3.5 py-3 backdrop-blur-sm">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/75">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-white">{children || "—"}</dd>
    </div>
  );
}

/** Banner with the trip's name and key facts. `actions` (print / delete…) sit in the top-right. */
export default function TripHeader({ trip, actions }) {
  const dates = formatDateRange(trip.startDate, tripEndDate(trip));
  const duration = trip.duration ? `${trip.duration} ${Number(trip.duration) === 1 ? "day" : "days"}` : "";

  return (
    <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-card sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-white/75">Trip</p>
          <h1 className="mt-1 break-words text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{trip.title || "Untitled trip"}</h1>
        </div>
        {actions}
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Fact icon={MapPin} label="Destination">
          {trip.destination}
        </Fact>
        <Fact icon={Navigation} label="Starting from">
          {trip.startingFrom}
        </Fact>
        <Fact icon={CalendarDays} label={duration || "Dates"}>
          {dates}
        </Fact>
        <Fact icon={Users} label="Travelers">
          {trip.travelers}
        </Fact>
        <Fact icon={Tag} label="Category">
          {trip.category}
        </Fact>
        <Fact icon={Wallet} label="Budget">
          {trip.budget ? formatMoney(trip.budget, trip.currency) : ""}
        </Fact>
      </dl>

      {trip.interests?.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Interests">
          {trip.interests.map((interest) => (
            <li key={interest} className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
              {interest}
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
