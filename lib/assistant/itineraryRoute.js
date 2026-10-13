// Turns the model's raw JSON into a route-aware itinerary BEFORE normalizeItinerary validates it.
//
// The app, not the AI, owns the route: which city each day belongs to, the dates, and which
// journeys happen on which day come from lib/trips/stops.js. The model only fills in content
// (activities, hotel options, prices). Whatever numbering or dates it invents is overwritten,
// so a model that miscounts can't produce a plan that disagrees with the trip.
//
// One-city trips are left alone (backward compatible): they only get the route fingerprint
// used to detect "your route changed since this plan was made".

import { buildLegs, buildSchedule, routeSignature, shortPlace } from "../trips/stops.js";
import { ItineraryFormatError } from "./itinerary.js";

const int = (value) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
};

const hasActivities = (day) => Array.isArray(day?.activities) && day.activities.some((a) => typeof a?.title === "string" && a.title.trim());

const objects = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) : []);

/**
 * @param raw   parsed model output (unvalidated)
 * @param trip  the trip document (needs stops or destination, startDate, startingFrom, ...)
 * @returns an object ready for normalizeItinerary. Throws ItineraryFormatError if a multi-city
 *          plan is missing a day, so the caller's retry logic asks the model again.
 */
export function adaptModelOutput(raw, trip) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw; // normalizeItinerary rejects it with the usual message

  const signature = routeSignature(trip);
  const schedule = buildSchedule(trip);
  if (schedule.stops.length < 2) return { ...raw, routeSignature: signature };

  // 1. Every day of the route must have real content. Extra days are ignored.
  const byNumber = new Map();
  (Array.isArray(raw.days) ? raw.days : []).forEach((day, index) => {
    const number = int(day?.day) ?? index + 1;
    if (!byNumber.has(number) && hasActivities(day)) byNumber.set(number, day);
  });

  // 2. Journeys: the model describes them, the app decides where they land.
  const legs = buildLegs(trip);
  const described = new Map();
  objects(raw.transfers).forEach((t) => {
    const n = int(t.leg);
    if (n !== null && n >= 1 && n <= legs.length && !described.has(n)) described.set(n, t);
  });
  const transferByDay = new Map();
  legs.forEach((leg, index) => {
    const t = described.get(index + 1) ?? {};
    transferByDay.set(leg.day, {
      from: shortPlace(leg.from),
      to: shortPlace(leg.to),
      mode: (typeof t.mode === "string" && t.mode.trim()) || leg.mode,
      duration: t.duration,
      price: t.price,
      notes: t.notes,
    });
  });

  // 3. Re-stamp every day from the schedule.
  const days = schedule.days.map((slot) => {
    const source = byNumber.get(slot.day);
    if (!source) throw new ItineraryFormatError(`Day ${slot.day} is missing from the itinerary`);
    return {
      ...source,
      day: slot.day,
      date: slot.date,
      stopId: slot.stopId,
      city: shortPlace(slot.place),
      ...(transferByDay.has(slot.day) && { transfer: transferByDay.get(slot.day) }),
    };
  });

  // 4. Hotels and per-city budgets: the model says "stop 2", we store the stop's id.
  const idOf = (stopNumber) => schedule.stops[(int(stopNumber) ?? 0) - 1]?.id;
  const accommodations = objects(raw.accommodations)
    .map((hotel) => ({ ...hotel, stopId: idOf(hotel.stop) }))
    .filter((hotel) => hotel.stopId);
  const budgetByStop = objects(raw.budgetByStop)
    .map((entry) => ({ ...entry, stopId: idOf(entry.stop) }))
    .filter((entry) => entry.stopId);

  const rest = { ...raw };
  delete rest.transfers; // folded into days[].transfer
  return { ...rest, days, accommodations, budgetByStop, routeSignature: signature };
}
