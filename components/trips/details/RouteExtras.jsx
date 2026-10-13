"use client";

import { useId, useState } from "react";

import CurrencyConverter from "@/components/trips/CurrencyConverter";
import WeatherForecast from "@/components/trips/WeatherForecast";
import { shortPlace } from "@/lib/trips/stops";

/** One forecast card per city, each for the days you are actually there. */
export function RouteWeather({ stops }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {stops.map((stop) => (
        <WeatherForecast key={stop.id} title={`Weather in ${shortPlace(stop.place)}`} destination={stop.place} startDate={stop.checkIn} duration={stop.dayCount} />
      ))}
    </div>
  );
}

/**
 * Currency converter for a multi-country trip: pick which country's currency to compare with.
 * One country (or no country data) just shows the converter for the first stop.
 */
export function RouteCurrency({ stops, trip }) {
  const selectId = useId();
  const byCountry = new Map();
  for (const stop of stops) {
    if (stop.countryCode && !byCountry.has(stop.countryCode)) byCountry.set(stop.countryCode, stop);
  }
  const options = [...byCountry.values()];
  const [code, setCode] = useState(options[0]?.countryCode ?? "");
  const chosen = options.find((stop) => stop.countryCode === code) ?? stops[0];

  return (
    <div className="space-y-3">
      {options.length > 1 && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={selectId} className="text-sm font-medium text-foreground">
            Convert your budget for
          </label>
          <select
            id={selectId}
            value={chosen.countryCode}
            onChange={(e) => setCode(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {options.map((stop) => (
              <option key={stop.countryCode} value={stop.countryCode}>
                {stop.country || stop.countryCode}
              </option>
            ))}
          </select>
        </div>
      )}
      <CurrencyConverter key={chosen.id} destination={chosen.place} from={trip.currency} amount={trip.budget} travelers={trip.travelers} duration={trip.duration} />
    </div>
  );
}
