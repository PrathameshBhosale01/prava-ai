"use client";

import { useId, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Flag, Globe2, MapPin, Plane, Plus, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { TRIP_OPTIONS } from "@/lib/assistant/config";
import { formatDateRange } from "@/lib/tripDetails";
import {
  MAX_STOPS, MAX_STOP_NIGHTS, MAX_TRIP_DAYS, addStop, buildSchedule, insertStopAt, isInternational, moveStop, newStopId,
  removeStop, shortPlace, totalDays, tripCountries, updateStop,
} from "@/lib/trips/stops";
import { cn } from "@/lib/utils";

import PlaceInput, { inputClass } from "./PlaceInput";
import Stepper from "./Stepper";

const iconButton =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

const focusLater = (id) => requestAnimationFrame(() => document.getElementById(id)?.focus());

function Badge({ children, tone = "primary" }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold", tone === "primary" ? "bg-primary text-primary-foreground" : "border border-border bg-surface-muted text-muted-foreground")}
    >
      {children}
    </span>
  );
}

/** One step on the rail: a badge, a vertical line down to the next step, and the content. */
function Step({ badge, isLast = false, children }) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        {badge}
        {!isLast && <div className="mt-1 w-px flex-1 bg-border" aria-hidden="true" />}
      </div>
      <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>{children}</div>
    </li>
  );
}

/**
 * The "Route" part of the New Trip form: where you start, an ordered list of destinations
 * (add / remove with undo / move up and down), and how the trip ends. One destination looks
 * almost like the old form; more destinations unlock nights per stay, how you get to each
 * one, and a running total.
 *
 * Fully controlled. `onStopsChange` is a React state setter, so it also accepts updater functions.
 * end = { mode: "return" | "elsewhere" | "oneWay", place }
 */
export default function RouteBuilder({ startingFrom, onStartingFromChange, stops, onStopsChange, end, onEndChange, startDate, transportation, warnings = [], stopLimit = MAX_STOPS, dayLimit = MAX_TRIP_DAYS, onPlanLimit }) {
  const baseId = useId();
  const [announcement, setAnnouncement] = useState("");

  const multi = stops.length > 1;
  const total = totalDays(stops);
  const atDayCap = total >= MAX_TRIP_DAYS;
  const atStopCap = stops.length >= MAX_STOPS;
  const defaultMode = TRIP_OPTIONS.transportations.includes(transportation) ? transportation : "Mixed";
  const countries = tripCountries(stops);

  // Dates per stop. Blank places get a stand-in name just so the schedule can be computed.
  const schedule = buildSchedule({ startDate, stops: stops.map((s, i) => ({ ...s, place: s.place.trim() || `Destination ${i + 1}` })) });

  const label = (stop, index) => shortPlace(stop.place) || `destination ${index + 1}`;

  // The plan can allow fewer cities / days than the app's hard limits. At that point "add" explains and offers Pro.
  const planStopCap = stopLimit < MAX_STOPS && stops.length >= stopLimit;
  const planDayCap = dayLimit < MAX_TRIP_DAYS && total >= dayLimit;

  function addDestination() {
    if (planStopCap) return onPlanLimit?.("STOP_COUNT");
    if (planDayCap) return onPlanLimit?.("TRIP_DAYS");
    const id = newStopId();
    const nights = Math.max(1, Math.min(2, MAX_TRIP_DAYS - total));
    onStopsChange((cur) => addStop(cur, { id, nights }));
    setAnnouncement(`Destination ${stops.length + 1} added.`);
    focusLater(`${baseId}-place-${id}`);
  }

  function removeDestination(stop, index) {
    onStopsChange((cur) => removeStop(cur, stop.id));
    const name = label(stop, index);
    setAnnouncement(`${name} removed. ${stops.length - 1} destination${stops.length - 1 === 1 ? "" : "s"} left.`);
    toast(`Removed ${name}`, { action: { label: "Undo", onClick: () => onStopsChange((cur) => insertStopAt(cur, stop, index)) } });
    focusLater(`${baseId}-add`);
  }

  function moveDestination(stop, index, delta) {
    onStopsChange((cur) => moveStop(cur, stop.id, delta));
    setAnnouncement(`${label(stop, index)} moved to position ${index + delta + 1} of ${stops.length}.`);
    const atEdge = index + delta === 0 || index + delta === stops.length - 1;
    focusLater(`${baseId}-${atEdge ? (delta < 0 ? "down" : "up") : delta < 0 ? "up" : "down"}-${stop.id}`);
  }

  const summaryParts = [
    `${stops.length} ${stops.length === 1 ? "destination" : "destinations"}`,
    countries.length > 1 ? `${countries.length} countries` : "",
    `${total} ${total === 1 ? "day" : "days"}`,
    startDate && schedule.endDate ? formatDateRange(schedule.startDate, schedule.endDate) : "",
  ].filter(Boolean);

  const startName = shortPlace(startingFrom) || "where you started";

  return (
    <div className="space-y-4">
      <ol className="list-none">
        {/* ── Start ───────────────────────────────────────────── */}
        <Step badge={<Badge tone="muted"><MapPin className="h-4 w-4" aria-hidden="true" /></Badge>}>
          <PlaceInput
            id={`${baseId}-start`}
            label="Starting from"
            value={startingFrom}
            onChange={onStartingFromChange}
            onSelect={(p) => onStartingFromChange(p.place)}
            placeholder="e.g. Mumbai"
          />
        </Step>

        {/* ── Destinations ────────────────────────────────────── */}
        {stops.map((stop, index) => {
          const s = schedule.stops[index];
          const when = s?.checkIn ? formatDateRange(s.checkIn, s.checkOut) : "";
          const name = label(stop, index);
          return (
            <Step key={stop.id} badge={<Badge>{index + 1}</Badge>}>
              <div role="group" aria-label={`Destination ${index + 1}${stop.place.trim() ? `: ${name}` : ""}`} className="rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <PlaceInput
                      id={`${baseId}-place-${stop.id}`}
                      label={multi ? `Destination ${index + 1}` : "Destination"}
                      value={stop.place}
                      onChange={(text) => onStopsChange((cur) => updateStop(cur, stop.id, { place: text }))}
                      onSelect={(p) => onStopsChange((cur) => updateStop(cur, stop.id, { place: p.place, country: p.country, countryCode: p.countryCode, lat: p.lat, lon: p.lon }))}
                      placeholder="e.g. Goa, India"
                    />
                  </div>
                  {multi && (
                    <div className="flex shrink-0 items-center">
                      <button type="button" id={`${baseId}-up-${stop.id}`} onClick={() => moveDestination(stop, index, -1)} disabled={index === 0} aria-label={`Move ${name} up`} className={iconButton}>
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button" id={`${baseId}-down-${stop.id}`} onClick={() => moveDestination(stop, index, 1)} disabled={index === stops.length - 1} aria-label={`Move ${name} down`} className={iconButton}>
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => removeDestination(stop, index)} aria-label={`Remove ${name}`} className={cn(iconButton, "hover:bg-danger-soft hover:text-danger")}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {stop.country && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {stop.country}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
                  {multi ? (
                    <Stepper label={`Stay in ${name}`} unit="night" value={stop.nights} min={1} max={MAX_STOP_NIGHTS} canIncrease={!atDayCap} onChange={(n) => onStopsChange((cur) => updateStop(cur, stop.id, { nights: n }))} />
                  ) : (
                    <div>
                      <p className="mb-2 text-sm font-medium">Trip length</p>
                      <Stepper label="Trip length" unit="day" value={stop.nights + 1} min={1} max={MAX_TRIP_DAYS} onChange={(n) => onStopsChange((cur) => updateStop(cur, stop.id, { nights: n - 1 }))} />
                    </div>
                  )}

                  {multi && (
                    <div className="min-w-[10rem] flex-1">
                      <label htmlFor={`${baseId}-mode-${stop.id}`} className="mb-2 block text-sm font-medium">
                        {index === 0 ? "Getting there" : `Getting from ${shortPlace(stops[index - 1].place) || `destination ${index}`}`}
                      </label>
                      <select
                        id={`${baseId}-mode-${stop.id}`}
                        value={stop.travelMode ?? ""}
                        onChange={(e) => onStopsChange((cur) => updateStop(cur, stop.id, { travelMode: e.target.value }))}
                        className={cn(inputClass, "py-2.5")}
                      >
                        <option value="">Trip default ({defaultMode})</option>
                        {TRIP_OPTIONS.transportations.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {when && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {when}
                    {multi && ` · ${stop.nights} ${stop.nights === 1 ? "night" : "nights"}`}
                  </p>
                )}
              </div>
            </Step>
          );
        })}

        {/* ── End ─────────────────────────────────────────────── */}
        <Step isLast badge={<Badge tone="muted"><Flag className="h-4 w-4" aria-hidden="true" /></Badge>}>
          <EndChoice baseId={baseId} startName={startName} end={end} onEndChange={onEndChange} multi={multi} />
        </Step>
      </ol>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          id={`${baseId}-add`}
          onClick={addDestination}
          disabled={atStopCap || atDayCap}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary/50 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {stops.length === 1 ? "Add another city" : "Add destination"}
        </button>
        {atStopCap && <p className="text-xs text-muted-foreground">Up to {MAX_STOPS} destinations per trip.</p>}
        {!atStopCap && planStopCap && (
          <p className="text-xs text-muted-foreground">
            Your plan includes {stopLimit} destinations per trip.{" "}
            <button type="button" onClick={() => onPlanLimit?.("STOP_COUNT")} className="cursor-pointer font-medium text-primary underline-offset-2 hover:underline">
              Upgrade for {MAX_STOPS}
            </button>
          </p>
        )}
        {!atStopCap && atDayCap && <p className="text-xs text-muted-foreground">Trips can be up to {MAX_TRIP_DAYS} days. Shorten a stay to add another destination.</p>}
      </div>

      {multi && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg bg-info-soft px-4 py-2.5 text-sm font-medium text-info">
          <Plane className="h-4 w-4 shrink-0" aria-hidden="true" />
          {summaryParts.join(" · ")}
        </p>
      )}

      {isInternational(stops) && (
        <p className="text-xs text-muted-foreground">This trip crosses borders. Check visa and entry rules for {countries.join(", ")} before you book.</p>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-2" aria-label="Route suggestions">
          {warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-foreground">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              {w}
            </li>
          ))}
        </ul>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** How the trip ends. Tucked away for one-city trips (most people just go home), open for multi-city ones. */
function EndChoice({ baseId, startName, end, onEndChange, multi }) {
  const name = `${baseId}-end`;
  const options = [
    { mode: "return", text: `Return to ${startName}` },
    { mode: "elsewhere", text: "End in a different city" },
    { mode: "oneWay", text: "One-way, no return" },
  ];

  const body = (
    <fieldset className="space-y-2">
      <legend className="sr-only">How the trip ends</legend>
      {options.map((o) => (
        <label key={o.mode} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40">
          <input type="radio" name={name} value={o.mode} checked={end.mode === o.mode} onChange={() => onEndChange({ ...end, mode: o.mode })} className="h-4 w-4" />
          {o.text}
        </label>
      ))}
      {end.mode === "elsewhere" && (
        <div className="pt-1">
          <PlaceInput id={`${baseId}-end-place`} label="Where does the trip end?" value={end.place} onChange={(place) => onEndChange({ ...end, place })} onSelect={(p) => onEndChange({ ...end, place: p.place })} placeholder="e.g. Chennai" />
        </div>
      )}
    </fieldset>
  );

  if (multi) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium">How does the trip end?</p>
        {body}
      </div>
    );
  }

  return (
    <details className="group rounded-xl border border-border bg-surface px-4 py-3 sm:px-5">
      <summary className="cursor-pointer list-none text-sm text-muted-foreground marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        <span className="font-medium text-foreground">{end.mode === "return" ? `Return to ${startName}` : end.mode === "oneWay" ? "One-way, no return" : "Ending in a different city"}</span>
        <span className="ml-2 underline-offset-2 group-open:hidden hover:underline">Change</span>
      </summary>
      <div className="mt-3">{body}</div>
    </details>
  );
}
