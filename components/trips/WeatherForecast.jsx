"use client";

import { useEffect, useState } from "react";

function formatDay(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function Message({ children }) {
  return <p className="mt-4 text-sm text-muted-foreground">{children}</p>;
}

export default function WeatherForecast({ destination, startDate, duration }) {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setState({ status: "loading" });

        const params = new URLSearchParams({
          destination,
          startDate,
          duration: String(duration),
        });

        const res = await fetch(`/api/weather?${params}`, {
          signal: controller.signal,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          throw new Error(data?.error || "Could not load weather");
        }

        setState({ status: "done", data });
      } catch (err) {
        if (err.name === "AbortError") return;
        setState({ status: "error", message: err.message });
      }
    }

    load();

    return () => controller.abort();
  }, [destination, startDate, duration]);

  const { status, data, message } = state;

  return (
    <div className="rounded-xl border bg-surface p-6">
      <h2 className="text-xl font-semibold">Weather</h2>

      {status === "loading" && <Message>Loading forecast...</Message>}

      {status === "error" && <Message>Couldn&apos;t load the forecast right now.</Message>}

      {status === "done" && !data.available && (
        <>
          {data.reason === "too_far" && (
            <Message>
              Forecasts only go about two weeks ahead. Check back from{" "}
              {formatDay(data.availableFrom)}.
            </Message>
          )}
          {data.reason === "past" && <Message>This trip is in the past.</Message>}
          {data.reason === "not_found" && (
            <Message>Couldn&apos;t find &quot;{destination}&quot; for a forecast.</Message>
          )}
        </>
      )}

      {status === "done" && data.available && (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.location.name}
            {data.location.country ? `, ${data.location.country}` : ""}
            {data.partial && " · forecast covers part of your trip"}
          </p>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {data.days.map((day) => (
              <div
                key={day.date}
                className="min-w-[120px] shrink-0 rounded-lg border bg-surface-muted p-3 text-center"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {formatDay(day.date)}
                </p>
                <p className="my-2 text-3xl">{day.emoji}</p>
                <p className="text-sm font-semibold">
                  {day.max}° / {day.min}°
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{day.label}</p>
                {day.rainChance != null && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Rain {day.rainChance}%
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Weather data by Open-Meteo.com
          </p>
        </>
      )}
    </div>
  );
}