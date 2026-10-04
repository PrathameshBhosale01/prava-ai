"use client";

import { Loader2, MapPin } from "lucide-react";

import WeatherIcon from "@/components/weather/WeatherIcon";
import { useWeather } from "@/context/WeatherContext";
import { cn } from "@/lib/utils";

const chip = cn(
  "inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3",
  "text-sm font-medium text-foreground transition-colors hover:bg-surface-muted",
  "disabled:cursor-wait cursor-pointer"
);

export default function HeaderWeather() {
  const { weather, isLoading, refresh } = useWeather();

  // Nothing loaded yet: invite the user to share their location.
  if (!weather) {
    return (
      <button
        type="button"
        onClick={() => refresh()}
        disabled={isLoading}
        className={chip}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <MapPin className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="hidden sm:inline">
          {isLoading ? "Locating…" : "Get weather"}
        </span>
        <span className="sr-only sm:hidden">Get weather</span>
      </button>
    );
  }

  const { current, location } = weather;

  return (
    <button
      type="button"
      onClick={() => refresh()}
      disabled={isLoading}
      title="Refresh weather"
      aria-label={`${current.label} in ${location.name}, ${current.temperature} degrees Celsius. Refresh weather`}
      className={chip}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <WeatherIcon code={current.code} isDay={current.isDay} className="h-4 w-4 text-primary" />
      )}
      <span>{current.temperature}°C</span>
      <span className="hidden max-w-[8rem] truncate text-muted-foreground sm:inline">
        {location.name}
      </span>
    </button>
  );
}