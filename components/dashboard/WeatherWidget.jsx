"use client";

import { useState } from "react";
import {
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  Search,
  Thermometer,
  Wind,
} from "lucide-react";

import Button from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import WeatherIcon from "@/components/weather/WeatherIcon";
import { useWeather } from "@/context/WeatherContext";
import { cn } from "@/lib/utils";

function formatDay(date) {
  const d = new Date(`${date}T00:00:00`);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    date: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
  };
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-surface-muted px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function WeatherDetails({ weather, updating }) {
  const { location, current, forecast } = weather;

  return (
    <div className={cn("space-y-5 transition-opacity", updating && "opacity-60")}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <WeatherIcon code={current.code} isDay={current.isDay} className="h-8 w-8" />
          </span>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {location.name}
                {location.country ? `, ${location.country}` : ""}
              </span>
            </p>
            <p className="text-4xl font-semibold tracking-tight text-foreground">
              {current.temperature}°C
            </p>
            <p className="text-sm text-muted-foreground">{current.label}</p>
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 lg:w-96">
          <Stat icon={Thermometer} label="Feels like" value={`${current.feelsLike}°C`} />
          <Stat icon={Droplets} label="Humidity" value={`${current.humidity}%`} />
          <Stat icon={Wind} label="Wind" value={`${current.windSpeed} km/h`} />
        </dl>
      </div>

      {forecast?.length > 0 && (
        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-medium text-muted-foreground">Next 3 days</h3>

          <ul className="mt-3 grid grid-cols-3 gap-3">
            {forecast.map((day) => {
              const label = formatDay(day.date);
              return (
                <li
                  key={day.date}
                  className="flex flex-col items-center rounded-lg border border-border px-2 py-3 text-center sm:px-3"
                >
                  <span className="text-sm font-medium text-foreground">{label.weekday}</span>
                  <span className="text-xs text-muted-foreground">{label.date}</span>

                  <WeatherIcon code={day.code} className="my-2 h-6 w-6 text-primary" />

                  <span className="text-sm font-semibold text-foreground">
                    {day.max}°
                    <span className="font-normal text-muted-foreground"> / {day.min}°</span>
                  </span>
                  <span className="mt-1 hidden text-xs text-muted-foreground sm:block">
                    {day.label}
                  </span>
                  {day.rainChance != null && (
                    <span className="mt-1 flex items-center gap-1 text-xs text-info">
                      <Droplets className="h-3 w-3" aria-hidden="true" />
                      {day.rainChance}%
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading weather">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-border pt-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
        <CloudSun className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-medium text-foreground">No weather loaded yet</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Search for a city or use your current location to see conditions and a 3-day forecast.
      </p>
    </div>
  );
}

export default function WeatherWidget() {
  const { weather, isLoading, locate, searchCity } = useWeather();
  const [city, setCity] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const ok = await searchCity(city);
    if (ok) setCity("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weather</CardTitle>
        <CardDescription>Check conditions for your location or any city.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="weather-city" className="sr-only">
              City name
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="weather-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Search a city, e.g. Mumbai"
              autoComplete="off"
              maxLength={100}
              className="pl-9"
            />
          </div>

          <Button type="submit" disabled={isLoading || !city.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            Search
          </Button>

          <Button type="button" variant="outline" onClick={() => locate()} disabled={isLoading}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Use my location
          </Button>
        </form>

        <div aria-live="polite" className="mt-6">
          {!weather && isLoading && <WeatherSkeleton />}
          {!weather && !isLoading && <EmptyState />}
          {weather && <WeatherDetails weather={weather} updating={isLoading} />}
        </div>
      </CardContent>
    </Card>
  );
}