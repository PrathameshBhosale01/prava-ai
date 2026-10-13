import { ExternalLink } from "lucide-react";

import { buildLegs, buildSchedule, mapsRouteUrl, shortPlace, tripEndpoint } from "@/lib/trips/stops";

import ModeIcon from "./ModeIcon";

function Pill({ children, muted }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${muted ? "bg-white/10 text-white/85" : "bg-white/25 text-white"}`}>{children}</span>;
}

function Leg({ mode, label }) {
  return (
    <li className="flex items-center text-white/80">
      <ModeIcon mode={mode} className="h-3.5 w-3.5" />
      <span className="sr-only">{label}</span>
    </li>
  );
}

/**
 * "Pune → Delhi (2n) → Mumbai (3n) → … → Pune": the whole route at a glance, with how you
 * travel between the stops. Meant for the dark header banner. Renders nothing for one-city trips.
 */
export default function RouteStrip({ trip }) {
  const { stops } = buildSchedule(trip);
  if (stops.length < 2) return null;

  const legs = buildLegs(trip);
  const modeInto = (stopId) => legs.find((leg) => leg.toStopId === stopId)?.mode;
  const returnLeg = legs.find((leg) => leg.kind === "return");
  const start = shortPlace(trip.startingFrom);
  const end = tripEndpoint(trip);

  return (
    <div className="mt-5">
      <ol aria-label="Trip route" className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {start && (
          <li>
            <Pill muted>{start}</Pill>
          </li>
        )}
        {stops.map((stop) => {
          const mode = modeInto(stop.id);
          return [
            mode && <Leg key={`leg-${stop.id}`} mode={mode} label={`then by ${mode} to`} />,
            <li key={stop.id}>
              <Pill>
                {shortPlace(stop.place)}{" "}
                <span className="font-normal text-white/80">
                  {stop.nights} {stop.nights === 1 ? "night" : "nights"}
                </span>
              </Pill>
            </li>,
          ];
        })}
        {end && returnLeg && <Leg mode={returnLeg.mode} label={`then by ${returnLeg.mode} to`} />}
        {end && (
          <li>
            <Pill muted>{shortPlace(end)}</Pill>
          </li>
        )}
      </ol>
      <a
        href={mapsRouteUrl(trip)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/90 underline-offset-2 hover:underline print:hidden"
      >
        Open the full route in Maps
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </div>
  );
}
