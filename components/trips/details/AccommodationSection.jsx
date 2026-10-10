import { BedDouble, ExternalLink, MapPin, Star } from "lucide-react";

import { formatMoney, hotelLinks, tripNights } from "@/lib/tripDetails";

import SectionCard from "./SectionCard";

const LINKS = [
  { key: "booking", label: "Booking", className: "bg-blue-600 text-white hover:bg-blue-700" },
  { key: "expedia", label: "Expedia", className: "bg-amber-500 text-white hover:bg-amber-600" },
  { key: "hotels", label: "Hotels.com", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { key: "maps", label: "Maps", className: "bg-slate-800 text-white hover:bg-slate-900" },
];

function HotelCard({ hotel, trip }) {
  const links = hotelLinks(hotel, trip);
  const nights = tripNights(trip);

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

export default function AccommodationSection({ hotels, trip }) {
  return (
    <SectionCard
      id="trip-stay"
      icon={BedDouble}
      title="Accommodation options"
      note="AI suggestions. Prices and availability change, so check the current rate before you book."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hotels.map((hotel) => (
          <HotelCard key={hotel.name} hotel={hotel} trip={trip} />
        ))}
      </ul>
    </SectionCard>
  );
}
