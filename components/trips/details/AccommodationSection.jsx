import { BedDouble, ExternalLink, MapPin, Star } from "lucide-react";

import { formatMoney, hotelLinks, tripNights } from "@/lib/tripDetails";

import SectionCard from "./SectionCard";

const LINKS = [
  { key: "booking", label: "Booking", className: "bg-blue-600 text-white hover:bg-blue-700" },
  { key: "expedia", label: "Expedia", className: "bg-amber-500 text-white hover:bg-amber-600" },
  { key: "hotels", label: "Hotels.com", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { key: "maps", label: "Maps", className: "bg-slate-800 text-white hover:bg-slate-900" },
];

function HotelCard({ hotel, trip, stop }) {
  const links = hotelLinks(hotel, trip, stop);
  const nights = stop ? stop.nights : tripNights(trip);

  return (
    <li className="flex break-inside-avoid flex-col overflow-hidden rounded-xl border border-border bg-background">
      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-primary-soft to-info-soft" aria-hidden="true">
        <BedDouble className="h-9 w-9 text-primary/50" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-base font-semibold leading-snug text-foreground">{hotel.name}</h3>

        {hotel.rating != null && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden="true" />
            <span>
              <span className="sr-only">Approximate rating: </span>
              {hotel.rating} / 5
            </span>
          </p>
        )}

        {hotel.address && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {hotel.address}
          </p>
        )}
        {hotel.description && <p className="mt-2 text-sm leading-relaxed text-foreground/85">{hotel.description}</p>}

        <div className="mt-auto pt-4">
          {hotel.pricePerNight != null && (
            <p className="text-right">
              <span className="text-xl font-bold text-primary">{formatMoney(hotel.pricePerNight, trip.currency)}</span>
              <span className="ml-1 text-xs text-muted-foreground">per night</span>
              {nights > 1 && (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  ≈ {formatMoney(hotel.pricePerNight * nights, trip.currency)} for {nights} nights
                </span>
              )}
            </p>
          )}

          <p className="mt-3 text-xs font-medium text-muted-foreground print:hidden">Check prices</p>
          <ul className="mt-1.5 grid grid-cols-2 gap-1.5 print:hidden">
            {LINKS.map(({ key, label, className }) => (
              <li key={key}>
                <a
                  href={links[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${hotel.name} on ${label} (opens in a new tab)`}
                  className={`flex h-8 items-center justify-center gap-1 rounded-md text-xs font-medium transition-colors ${className}`}
                >
                  {label}
                  <ExternalLink className="h-3 w-3 opacity-80" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  );
}

function HotelGrid({ hotels, trip, stop }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {hotels.map((hotel) => (
        <HotelCard key={`${stop?.id ?? "trip"}-${hotel.name}`} hotel={hotel} trip={trip} stop={stop} />
      ))}
    </ul>
  );
}

/**
 * Hotel options. On a multi-city trip (`stops` given) they are grouped by city, and each hotel's
 * booking links use that city's own check-in and check-out dates.
 */
export default function AccommodationSection({ hotels, trip, stops = null }) {
  const groups = stops ? stops.filter((stop) => stop.hotels.length > 0) : [];

  return (
    <SectionCard
      id="trip-stay"
      icon={BedDouble}
      title="Accommodation options"
      note={`AI suggestions${groups.length > 0 ? " for each city" : ""}. Prices and availability change, so check the current rate before you book.`}
    >
      {groups.length > 0 ? (
        <div className="space-y-7">
          {groups.map((stop) => (
            <div key={stop.id}>
              <h3 className="mb-3 flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-foreground">
                {stop.city}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {stop.stayLabel} · {stop.nights} {stop.nights === 1 ? "night" : "nights"}
                </span>
              </h3>
              <HotelGrid hotels={stop.hotels} trip={trip} stop={stop} />
            </div>
          ))}
        </div>
      ) : (
        <HotelGrid hotels={hotels} trip={trip} />
      )}
    </SectionCard>
  );
}
