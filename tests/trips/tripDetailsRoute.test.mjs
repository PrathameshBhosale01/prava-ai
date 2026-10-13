import test from "node:test";
import assert from "node:assert/strict";

import { normalizeItinerary } from "../../lib/assistant/itinerary.js";
import { adaptModelOutput } from "../../lib/assistant/itineraryRoute.js";
import { activityLinks, buildItineraryView, hotelLinks } from "../../lib/tripDetails.js";
import { buildSchedule } from "../../lib/trips/stops.js";

const trip = {
  title: "India loop", startingFrom: "Pune", startDate: "2027-03-24", travelers: 2, budget: 200000, currency: "INR", transportation: "Mixed",
  stops: [
    { id: "a", place: "Delhi, India", nights: 2 },
    { id: "b", place: "Mumbai, India", nights: 3, travelMode: "Flight" },
    { id: "c", place: "Goa, India", nights: 3, travelMode: "Train" },
  ],
}; // 9 days: Delhi 1-2, Mumbai 3-5, Goa 6-9

const day = (n) => ({ day: n, title: `Day ${n}`, activities: [{ time: "09:00", title: `Thing ${n}`, location: "x" }] });
const raw = () => ({
  summary: "Three cities",
  transfers: [{ leg: 2, mode: "Flight", duration: "2h", price: 9000 }, { leg: 3, mode: "Train", duration: "10h", price: 1800 }],
  accommodations: [{ stop: 1, name: "Delhi Inn", pricePerNight: 5000 }, { stop: 3, name: "Goa Villa", pricePerNight: 7000 }, { stop: 3, name: "Goa Hostel" }],
  days: Array.from({ length: 9 }, (_, i) => day(i + 1)),
  budgetByStop: [{ stop: 1, accommodation: 10000, food: 4000 }, { stop: 3, activities: 6000 }],
  budgetBreakdown: { accommodation: 60000, food: 30000, transportation: 30000, activities: 20000 },
});
const stored = () => normalizeItinerary(adaptModelOutput(raw(), trip));

test("hotel links for one city use that city and its own dates, not the whole trip's", () => {
  const stop = buildSchedule(trip).stops[2]; // Goa: check-in 2027-03-29, check-out 2027-04-01
  const { booking, expedia, maps } = hotelLinks({ name: "Goa Villa" }, trip, stop);
  const b = new URL(booking).searchParams;
  assert.deepEqual([b.get("ss"), b.get("checkin"), b.get("checkout"), b.get("group_adults")], ["Goa Villa, Goa, India", "2027-03-29", "2027-04-01", "2"]);
  assert.equal(new URL(expedia).searchParams.get("startDate"), "2027-03-29");
  assert.equal(new URL(maps).searchParams.get("query"), "Goa Villa, Goa, India");
  assert.equal(new URL(hotelLinks({ name: "X" }, { destination: "Rome", startDate: "2027-05-01", duration: 3 }).booking).searchParams.get("checkout"), "2027-05-03", "no stop → unchanged behaviour");
});

test("activity links use the day's own city", () => {
  const l = activityLinks({ title: "Baga Beach", location: "Baga" }, trip, "Goa, India");
  assert.equal(new URL(l.maps).searchParams.get("query"), "Baga, Goa, India");
  assert.equal(new URL(l.directions).searchParams.get("destination"), "Baga, Goa, India");
  assert.equal(new URL(activityLinks({ title: "Hike" }, { destination: "Bali" }).maps).searchParams.get("query"), "Hike, Bali", "no city → trip destination, as before");
});

test("view: a route-aware plan is grouped by city with each city's days, hotels and dates", () => {
  const v = buildItineraryView(stored(), trip);
  assert.equal(v.routeAware, true);
  assert.deepEqual(v.stops.map((s) => [s.city, s.days.map((d) => d.day), s.hotels.map((h) => h.name)]), [
    ["Delhi", [1, 2], ["Delhi Inn"]],
    ["Mumbai", [3, 4, 5], []],
    ["Goa", [6, 7, 8, 9], ["Goa Villa", "Goa Hostel"]],
  ]);
  assert.deepEqual(v.stops.map((s) => s.stayLabel), ["Mar 24 – Mar 25, 2027", "Mar 26 – Mar 28, 2027", "Mar 29 – Apr 1, 2027"]);
  assert.deepEqual(v.stops.map((s) => [s.checkIn, s.checkOut, s.nights]), [["2027-03-24", "2027-03-26", 2], ["2027-03-26", "2027-03-29", 3], ["2027-03-29", "2027-04-01", 3]]);
  assert.deepEqual(v.days.map((d) => d.city), ["Delhi", "Delhi", "Mumbai", "Mumbai", "Mumbai", "Goa", "Goa", "Goa", "Goa"]);
  assert.equal(v.days[5].stopPlace, "Goa, India");
});

test("view: city budgets and journey totals", () => {
  const v = buildItineraryView(stored(), trip);
  assert.deepEqual(v.cityBudgets, [
    { stopId: "a", city: "Delhi", accommodation: 10000, food: 4000, activities: 0, total: 14000 },
    { stopId: "c", city: "Goa", accommodation: 0, food: 0, activities: 6000, total: 6000 },
  ]);
  assert.equal(v.transferTotal, 9000 + 1800, "only journeys that have a price are summed");
  assert.equal(v.days[0].transfer.from, "Pune");
});

test("view: a multi-city trip with an OLD single-city plan is not route-aware (the page offers a new plan)", () => {
  const old = { summary: "Delhi only", days: [day(1), day(2), day(3)] };
  const v = buildItineraryView(old, trip);
  assert.equal(v.routeAware, false);
  assert.equal(v.stops, null);
  assert.deepEqual(v.cityBudgets, []);
  assert.equal(v.days.length, 3, "still renders as before");
});

test("view: stops that no longer exist make the plan non-route-aware instead of crashing", () => {
  const v = buildItineraryView(stored(), { ...trip, stops: trip.stops.slice(0, 2) });
  assert.equal(v.routeAware, false);
  assert.equal(v.stops, null);
});

test("view: a stop added after the plan was made shows up with no days, and nothing breaks", () => {
  const v = buildItineraryView(stored(), { ...trip, stops: [...trip.stops, { id: "z", place: "Chennai", nights: 2 }] });
  assert.equal(v.routeAware, true);
  assert.deepEqual(v.stops.at(-1).days, []);
});

test("view: one-city trips are exactly as before", () => {
  const single = { startingFrom: "Pune", startDate: "2027-03-24", destination: "Goa", duration: 2, budget: 100 };
  const v = buildItineraryView({ summary: "s", days: [day(1), day(2)], accommodations: [{ name: "H" }] }, single);
  assert.deepEqual([v.routeAware, v.stops, v.cityBudgets, v.transferTotal], [false, null, [], 0]);
  assert.ok(v.days.every((d) => !("city" in d) && !("stopPlace" in d)));
});
