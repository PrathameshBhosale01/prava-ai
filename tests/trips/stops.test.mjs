import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_STOPS, addStop, buildLegs, buildSchedule, distanceKm, getStops, isInternational, isItineraryStale, isMultiStop,
  insertStopAt, mapsRouteUrl, moveStop, removeStop, routeLabel, routeSignature, routeSummary, routeToTripFields, sanitizeStops,
  shortPlace, totalDays, tripCountries, tripEndpoint, updateStop, validateRoute,
} from "../../lib/trips/stops.js";

const oldTrip = { title: "Goa", destination: "Goa, India", startingFrom: "Mumbai", startDate: "2027-03-24", duration: 5, transportation: "Train" };

const delhi = { place: "Delhi, India", lat: 28.6139, lon: 77.209, country: "India", countryCode: "IN" };
const mumbai = { place: "Mumbai, India", lat: 19.076, lon: 72.8777, country: "India", countryCode: "IN" };
const goa = { place: "Goa, India", lat: 15.2993, lon: 74.124, country: "India", countryCode: "IN" };
const chennai = { place: "Chennai, India", lat: 13.0827, lon: 80.2707, country: "India", countryCode: "IN" };

const indiaTrip = {
  startingFrom: "Pune",
  startDate: "2027-03-24",
  transportation: "Mixed",
  stops: [
    { id: "a", ...delhi, nights: 2 },
    { id: "b", ...mumbai, nights: 3, travelMode: "Flight" },
    { id: "c", ...goa, nights: 3, travelMode: "Train" },
    { id: "d", ...chennai, nights: 2, travelMode: "Flight" },
  ],
};

/* ---------------------------- backward compatibility ---------------------------- */

test("an older trip (no stops) becomes one stop; total days equals its duration", () => {
  const stops = getStops(oldTrip);
  assert.equal(stops.length, 1);
  assert.deepEqual([stops[0].place, stops[0].nights, totalDays(stops)], ["Goa, India", 4, 5]);
  assert.equal(isMultiStop(oldTrip), false);
  assert.equal(getStops({ destination: "Rome", duration: 1 })[0].nights, 0, "a 1-day trip has 0 nights");
  assert.equal(totalDays(getStops({ destination: "Rome", duration: 1 })), 1);
  assert.equal(totalDays(getStops({ destination: "Rome" })), 1, "missing duration → 1 day, same as tripDetails");
});

test("older trips schedule exactly like the details page does today", () => {
  const s = buildSchedule(oldTrip);
  assert.deepEqual([s.totalDays, s.startDate, s.endDate], [5, "2027-03-24", "2027-03-28"]);
  assert.deepEqual([s.stops[0].checkIn, s.stops[0].checkOut], ["2027-03-24", "2027-03-28"], "4 nights");
  assert.deepEqual(s.days.map((d) => d.day), [1, 2, 3, 4, 5]);
  const dayTrip = buildSchedule({ destination: "Agra", duration: 1, startDate: "2027-03-24" });
  assert.deepEqual([dayTrip.totalDays, dayTrip.stops[0].checkIn, dayTrip.stops[0].checkOut], [1, "2027-03-24", "2027-03-24"]);
});

test("garbage never throws", () => {
  for (const bad of [undefined, null, {}, "x", 5, { stops: "x" }, { stops: [null, 3, {}] }, { destination: 42 }]) {
    assert.deepEqual(getStops(bad), [], JSON.stringify(bad));
    assert.equal(buildSchedule(bad).days.length, 0);
    assert.deepEqual(buildLegs(bad), []);
    assert.equal(routeLabel(bad), "");
    assert.equal(mapsRouteUrl(bad), "");
    assert.equal(isItineraryStale(bad), false);
  }
});

test("stored stops win over the legacy destination", () => {
  const t = { destination: "Old", duration: 9, stops: [{ id: "x", place: "New", nights: 1 }] };
  assert.deepEqual(getStops(t).map((s) => s.place), ["New"]);
});

/* -------------------------------- sanitizing -------------------------------- */

test("sanitizing: bad values are dropped, never stored as undefined (Firestore rejects undefined)", () => {
  const [s] = sanitizeStops([{ id: "z", place: "  Goa   India ", nights: "3", travelMode: "bus", countryCode: "india", lat: 99, lon: 10, country: "" }]);
  assert.deepEqual(s, { id: "z", place: "Goa India", nights: 3, travelMode: "Bus" });
  assert.ok(Object.values(s).every((v) => v !== undefined));
  const [c] = sanitizeStops([{ place: "X", nights: 1, countryCode: "in", lat: 10, lon: 20 }]);
  assert.deepEqual([c.countryCode, c.lat, c.lon], ["IN", 10, 20]);
  assert.equal("lat" in sanitizeStops([{ place: "X", nights: 1, lat: 10 }])[0], false, "coordinates only count as a pair");
});

test("sanitizing: empty stops dropped, ids made unique, count capped, nights clamped", () => {
  const out = sanitizeStops([{ id: "a", place: "A", nights: 2 }, { id: "a", place: "B", nights: 99 }, { place: "" }, { place: "C", nights: 0 }]);
  assert.deepEqual(out.map((s) => s.place), ["A", "B", "C"]);
  assert.equal(new Set(out.map((s) => s.id)).size, 3);
  assert.deepEqual(out.map((s) => s.nights), [2, 20, 1], "max 20; multi-stop minimum is 1");
  const many = sanitizeStops(Array.from({ length: 10 }, (_, i) => ({ place: `P${i}`, nights: 1 })));
  assert.equal(many.length, MAX_STOPS);
  assert.equal(sanitizeStops([{ place: "Solo", nights: 0 }])[0].nights, 0, "a single stop may be a day trip");
});

/* --------------------------------- schedule --------------------------------- */

test("Delhi → Mumbai → Goa → Chennai: days are partitioned exactly once, dates line up", () => {
  const s = buildSchedule(indiaTrip);
  assert.equal(s.totalDays, 11);
  assert.deepEqual(s.stops.map((x) => [x.firstDay, x.lastDay, x.dayCount]), [[1, 2, 2], [3, 5, 3], [6, 8, 3], [9, 11, 3]], "the last stop also owns the departure day");
  assert.deepEqual(s.days.map((d) => d.day), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(s.days.map((d) => d.stopIndex), [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
  assert.deepEqual([s.startDate, s.endDate], ["2027-03-24", "2027-04-03"]);
  assert.deepEqual(s.stops.map((x) => [x.checkIn, x.checkOut]), [["2027-03-24", "2027-03-26"], ["2027-03-26", "2027-03-29"], ["2027-03-29", "2027-04-01"], ["2027-04-01", "2027-04-03"]]);
  assert.equal(s.days.filter((d) => d.isArrivalDay).length, 4);
  assert.deepEqual(s.days.filter((d) => d.isLastDay).map((d) => d.day), [11]);
  // each stop's check-out is the next stop's check-in: no gap, no overlap
  for (let i = 1; i < s.stops.length; i += 1) assert.equal(s.stops[i].checkIn, s.stops[i - 1].checkOut);
});

test("month and year boundaries and a missing start date", () => {
  const s = buildSchedule({ startDate: "2026-12-30", stops: [{ place: "A", nights: 2 }, { place: "B", nights: 2 }] });
  assert.deepEqual(s.days.map((d) => d.date), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02", "2027-01-03"]);
  const none = buildSchedule({ stops: [{ place: "A", nights: 1 }, { place: "B", nights: 1 }] });
  assert.ok(none.days.every((d) => d.date === ""));
  assert.equal(buildSchedule({ startDate: "soon", stops: [{ place: "A", nights: 1 }] }).startDate, "");
});

test("reordering only changes who gets which days; the total stays the same", () => {
  const swapped = { ...indiaTrip, stops: moveStop(indiaTrip.stops, "a", 1) };
  const s = buildSchedule(swapped);
  assert.equal(s.totalDays, 11);
  assert.deepEqual(s.stops.map((x) => x.id), ["b", "a", "c", "d"]);
  assert.deepEqual(s.stops.map((x) => x.firstDay), [1, 4, 6, 9]);
});

/* ----------------------------------- legs ----------------------------------- */

test("round trip: outbound, three legs between cities, and the way home", () => {
  const legs = buildLegs(indiaTrip);
  assert.deepEqual(legs.map((l) => [l.kind, l.from, l.to, l.mode, l.day]), [
    ["outbound", "Pune", "Delhi, India", "Mixed", 1],
    ["between", "Delhi, India", "Mumbai, India", "Flight", 3],
    ["between", "Mumbai, India", "Goa, India", "Train", 6],
    ["between", "Goa, India", "Chennai, India", "Flight", 9],
    ["return", "Chennai, India", "Pune", "Mixed", 11],
  ]);
  assert.deepEqual(legs.map((l) => l.date), ["2027-03-24", "2027-03-26", "2027-03-29", "2027-04-01", "2027-04-03"]);
  const km = legs[1].distanceKm;
  assert.ok(km > 1100 && km < 1200, `Delhi–Mumbai ≈ 1,150 km, got ${km}`);
  assert.equal(legs[0].distanceKm, null);
});

test("open-jaw and one-way trips end where they should", () => {
  assert.equal(tripEndpoint(indiaTrip), "Pune");
  assert.equal(tripEndpoint({ ...indiaTrip, endingAt: "Delhi" }), "Delhi");
  assert.equal(tripEndpoint({ ...indiaTrip, oneWay: true, endingAt: "Delhi" }), null);
  assert.equal(buildLegs({ ...indiaTrip, endingAt: "Delhi" }).at(-1).to, "Delhi");
  assert.equal(buildLegs({ ...indiaTrip, oneWay: true }).at(-1).kind, "between", "no return leg");
});

test("mode falls back to the trip's transport; unknown modes can't sneak in", () => {
  const legs = buildLegs({ startingFrom: "A", transportation: "Bus", stops: [{ place: "B", nights: 1 }, { place: "C", nights: 1 }] });
  assert.deepEqual(legs.map((l) => l.mode), ["Bus", "Bus", "Bus"]);
  assert.equal(buildLegs({ startingFrom: "A", transportation: "Teleport", stops: [{ place: "B", nights: 1 }] })[0].mode, "Mixed");
});

test("distance needs coordinates on both ends", () => {
  assert.equal(distanceKm(delhi, undefined), null);
  assert.equal(distanceKm({ lat: 1 }, delhi), null);
  assert.equal(distanceKm(delhi, delhi), 0);
});

/* -------------------------------- validation -------------------------------- */

const ok = (over = {}) => validateRoute({ startingFrom: "Pune", transportation: "Mixed", stops: [{ id: "a", place: "Goa", nights: 3 }], ...over });

test("validation: required things, with sentences the form can show as-is", () => {
  assert.equal(ok({ startingFrom: " " }).error, "Starting location is required.");
  assert.equal(ok({ stops: [] }).error, "Add at least one destination.");
  assert.equal(ok({ stops: [{ place: "", nights: 2 }] }).error, "Destination is required.");
  assert.equal(ok({ stops: [{ place: "A", nights: 2 }, { place: " ", nights: 2 }] }).error, "Destination 2 is empty. Add a place or remove it.");
  assert.equal(ok({ stops: [{ place: "A, X", nights: 2 }, { place: "B", nights: 0 }] }).error, "B needs at least 1 night.");
  assert.equal(ok({ stops: [{ place: "A", nights: 25 }] }).error, "A can have at most 20 nights.");
  assert.equal(ok({ stops: Array.from({ length: 7 }, (_, i) => ({ place: `P${i}`, nights: 1 })) }).error, `A trip can have up to ${MAX_STOPS} destinations.`);
  assert.equal(validateRoute().ok, false);
});

test("validation: a one-stop day trip (0 nights) is fine, a multi-stop 0-night stay is not", () => {
  assert.equal(ok({ stops: [{ place: "Agra", nights: 0 }] }).ok, true);
  assert.equal(ok({ stops: [{ place: "Agra", nights: -1 }] }).error, "Duration must be greater than zero.");
});

test("validation: the 21-day cap counts the whole route", () => {
  assert.equal(ok({ stops: [{ place: "A", nights: 10 }, { place: "B", nights: 10 }] }).ok, true, "exactly 21 days is allowed");
  assert.match(ok({ stops: [{ place: "A", nights: 11 }, { place: "B", nights: 10 }] }).error, /22 days in total.*at most 21 days/);
});

test("validation: warnings advise but never block", () => {
  const dup = ok({ stops: [{ place: "Goa, India", nights: 2 }, { place: "goa", nights: 2 }] });
  assert.equal(dup.ok, true);
  assert.match(dup.warnings[0], /goa appears twice in a row/i);

  const far = ok({ transportation: "Bus", stops: [{ id: "1", ...delhi, nights: 2 }, { id: "2", ...chennai, nights: 2 }] });
  assert.equal(far.ok, true);
  assert.match(far.warnings[0], /Delhi → Chennai by Bus is about [\d,]+ km\. Consider a flight/);

  assert.deepEqual(ok({ transportation: "Bus", stops: [{ id: "1", ...delhi, nights: 2 }, { id: "2", ...chennai, nights: 2, travelMode: "Flight" }] }).warnings, [], "a flight leg is fine at any distance");
  assert.deepEqual(ok({ stops: [{ place: "A", nights: 1 }, { place: "B", nights: 1 }] }).warnings, [], "no coordinates → no distance advice");
});

test("warnings still show while something else is invalid (e.g. no start city yet)", () => {
  const r = validateRoute({ startingFrom: "", transportation: "Bus", stops: [{ id: "1", ...delhi, nights: 2 }, { id: "2", ...chennai, nights: 2 }] });
  assert.equal(r.ok, false);
  assert.equal(r.error, "Starting location is required.");
  assert.match(r.warnings[0], /Delhi → Chennai by Bus/);
});

test("validation returns the cleaned stops to store", () => {
  const r = ok({ stops: [{ place: "  Goa  ", nights: "3" }] });
  assert.deepEqual(r.stops.map((s) => [s.place, s.nights]), [["Goa", 3]]);
});

/* ------------------------------- list editing ------------------------------- */

test("add / remove / move follow the rules and never mutate the input", () => {
  const start = [{ id: "a", place: "A", nights: 1 }, { id: "b", place: "B", nights: 1 }];
  const frozen = Object.freeze(start.map(Object.freeze));
  const added = addStop(frozen, { place: "C" });
  assert.equal(added.length, 3);
  assert.equal(added[2].place, "C");
  assert.ok(added[2].id && added[2].id !== "a" && added[2].id !== "b");
  assert.equal(addStop(Array.from({ length: MAX_STOPS }, (_, i) => ({ id: `${i}`, place: "x", nights: 1 })), {}).length, MAX_STOPS);

  assert.deepEqual(removeStop(frozen, "a").map((s) => s.id), ["b"]);
  assert.equal(removeStop(removeStop(frozen, "a"), "b").length, 1, "the last stop stays");
  assert.equal(removeStop(frozen, "nope"), frozen);

  assert.deepEqual(moveStop(frozen, "a", 1).map((s) => s.id), ["b", "a"]);
  assert.deepEqual(moveStop(frozen, "b", -1).map((s) => s.id), ["b", "a"]);
  assert.equal(moveStop(frozen, "a", -1), frozen, "can't move the first stop up");
  assert.equal(moveStop(frozen, "b", 1), frozen, "can't move the last stop down");
  assert.equal(moveStop(frozen, "zzz", 1), frozen);
});

test("adding a 2nd stop to a day trip bumps the first stop to 1 night; undo puts a stop back where it was", () => {
  const day = [{ id: "a", place: "Agra", nights: 0 }];
  const two = addStop(day, { place: "Jaipur" });
  assert.deepEqual(two.map((s) => s.nights), [1, 2]);
  assert.equal(day[0].nights, 0, "input untouched");

  const three = [{ id: "a", place: "A", nights: 1 }, { id: "b", place: "B", nights: 1 }, { id: "c", place: "C", nights: 1 }];
  const removed = three[1];
  const after = removeStop(three, "b");
  assert.deepEqual(insertStopAt(after, removed, 1).map((s) => s.id), ["a", "b", "c"]);
  assert.deepEqual(insertStopAt(after, removed, 99).map((s) => s.id), ["a", "c", "b"], "index clamps to the end");
  assert.deepEqual(insertStopAt(after, removed, -5).map((s) => s.id), ["b", "a", "c"]);
  assert.equal(insertStopAt(three, removed, 0), three, "already there → no duplicate");
});

test("changing a stop's place forgets the old place's country and coordinates", () => {
  const stops = [{ id: "a", ...delhi, nights: 2, travelMode: "Train" }, { id: "b", place: "B", nights: 1 }];
  const typed = updateStop(stops, "a", { place: "Agra" });
  assert.deepEqual(typed[0], { id: "a", place: "Agra", nights: 2, travelMode: "Train" });
  const picked = updateStop(stops, "a", { place: "Agra, India", country: "India", countryCode: "IN", lat: 27.17, lon: 78.01 });
  assert.equal(picked[0].countryCode, "IN");
  assert.equal(updateStop(stops, "a", { nights: 5 })[0].lat, delhi.lat, "editing nights keeps the place data");
  assert.equal(typed[1], stops[1], "other stops are untouched");
});

/* --------------------------------- saving --------------------------------- */

function assertNoUndefined(value, path = "") {
  if (value === undefined) assert.fail(`undefined at ${path}`);
  if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) assertNoUndefined(v, `${path}.${k}`);
}

test("saved fields: legacy destination/duration stay filled, nothing is undefined", () => {
  const f = routeToTripFields({ stops: indiaTrip.stops, endingAt: " Delhi " });
  assert.deepEqual([f.destination, f.duration, f.endingAt, f.oneWay], ["Delhi, India", 11, "Delhi", false]);
  assert.equal(f.stops.length, 4);
  assertNoUndefined(f);
  const oneWay = routeToTripFields({ stops: indiaTrip.stops, endingAt: "Delhi", oneWay: true });
  assert.deepEqual([oneWay.endingAt, oneWay.oneWay], ["", true], "one-way clears a previous end city");
  assertNoUndefined(routeToTripFields({ stops: [{ place: "X", nights: 1 }] }));
  assert.deepEqual(routeToTripFields({ stops: [] }), { stops: [], destination: "", duration: 1, endingAt: "", oneWay: false });
});

/* --------------------------------- display --------------------------------- */

test("route label and summary", () => {
  assert.equal(shortPlace("Goa, India"), "Goa");
  assert.equal(routeLabel(indiaTrip), "Delhi → Mumbai → Goa → Chennai");
  assert.equal(routeLabel(indiaTrip, { max: 3 }), "Delhi → Mumbai → +2");
  assert.equal(routeLabel(oldTrip), "Goa");
  assert.deepEqual(routeSummary(indiaTrip), { count: 4, first: "Delhi", more: 3, countries: 1, badge: "4 cities" });
  assert.equal(routeSummary(oldTrip).badge, "", "single destination → no badge");
});

test("countries and international detection", () => {
  const sea = { stops: [{ place: "Delhi", nights: 1, country: "India", countryCode: "IN" }, { place: "Bangkok", nights: 3, country: "Thailand", countryCode: "TH" }, { place: "Phuket", nights: 2, country: "Thailand", countryCode: "TH" }, { place: "Singapore", nights: 2, country: "Singapore", countryCode: "SG" }] };
  assert.deepEqual(tripCountries(getStops(sea)), ["India", "Thailand", "Singapore"]);
  assert.equal(isInternational(getStops(sea)), true);
  assert.equal(routeSummary(sea).badge, "4 cities · 3 countries");
  assert.equal(isInternational(getStops(indiaTrip)), false);
  assert.equal(isInternational(getStops({ stops: [{ place: "A", nights: 1 }, { place: "B", nights: 1 }] })), false, "no country data → unknown, not international");
});

test("Google Maps route link: round trip, one-way, and special characters", () => {
  const url = new URL(mapsRouteUrl(indiaTrip));
  assert.equal(url.hostname, "www.google.com");
  assert.deepEqual([url.searchParams.get("origin"), url.searchParams.get("destination")], ["Pune", "Pune"]);
  assert.equal(url.searchParams.get("waypoints"), "Delhi, India|Mumbai, India|Goa, India|Chennai, India");

  const oneWay = new URL(mapsRouteUrl({ ...indiaTrip, oneWay: true }));
  assert.equal(oneWay.searchParams.get("destination"), "Chennai, India");
  assert.equal(oneWay.searchParams.get("waypoints"), "Delhi, India|Mumbai, India|Goa, India");

  const single = new URL(mapsRouteUrl({ startingFrom: "A", oneWay: true, stops: [{ place: "B & C #1", nights: 1 }] }));
  assert.equal(single.searchParams.get("destination"), "B & C #1");
  assert.equal(single.searchParams.has("waypoints"), false);
});

/* ------------------------------- stale itinerary ------------------------------- */

test("route signature changes when the route changes, and only then", () => {
  const base = routeSignature(indiaTrip);
  assert.equal(routeSignature({ ...indiaTrip }), base);
  assert.equal(routeSignature({ ...indiaTrip, budget: 1, travelers: 9, title: "renamed", interests: ["x"] }), base, "budget/title/etc. don't affect the plan's route");
  assert.equal(routeSignature({ ...indiaTrip, stops: indiaTrip.stops.map((s) => ({ ...s, place: ` ${s.place.toUpperCase()} ` })) }), base, "case and spacing don't matter");
  assert.notEqual(routeSignature({ ...indiaTrip, stops: moveStop(indiaTrip.stops, "a", 1) }), base, "reorder");
  assert.notEqual(routeSignature({ ...indiaTrip, stops: updateStop(indiaTrip.stops, "c", { nights: 4 }) }), base, "nights");
  assert.notEqual(routeSignature({ ...indiaTrip, stops: removeStop(indiaTrip.stops, "d") }), base, "removed stop");
  assert.notEqual(routeSignature({ ...indiaTrip, startDate: "2027-03-25" }), base, "dates");
  assert.notEqual(routeSignature({ ...indiaTrip, endingAt: "Delhi" }), base, "different end city");
  assert.notEqual(routeSignature({ ...indiaTrip, oneWay: true }), base, "one-way");
  assert.notEqual(routeSignature({ ...indiaTrip, stops: updateStop(indiaTrip.stops, "b", { travelMode: "Train" }) }), base, "mode");
});

test("stale itinerary: flagged only when we can prove it, never for older plans", () => {
  const current = { ...indiaTrip, itinerary: { routeSignature: routeSignature(indiaTrip), days: [] } };
  assert.equal(isItineraryStale(current), false);
  assert.equal(isItineraryStale({ ...current, stops: moveStop(current.stops, "a", 1) }), true);
  assert.equal(isItineraryStale({ ...oldTrip, itinerary: { summary: "s", days: [] } }), false, "no signature saved → unknown → not flagged");
  assert.equal(isItineraryStale({ ...oldTrip }), false, "no itinerary at all");
});
