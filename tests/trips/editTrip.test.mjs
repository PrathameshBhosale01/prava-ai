import test from "node:test";
import assert from "node:assert/strict";

import { buildTripFields, buildUpdate, routeChanged, tripToFormState } from "../../lib/trips/editTrip.js";
import { isItineraryStale, moveStop, routeSignature, updateStop, validateRoute } from "../../lib/trips/stops.js";

const legacy = { id: "t1", title: "Goa", category: "Leisure", description: "Beach", destination: "Goa, India", startingFrom: "Mumbai", budget: 20000, currency: "INR", duration: 4, travelers: 2, startDate: "2027-03-24", interests: ["Beaches"], accommodation: "Hotel", transportation: "Train", itinerary: { summary: "s", days: [] } };
const multi = {
  ...legacy, title: "Loop", destination: "Delhi, India", duration: 9, endingAt: "Chennai", oneWay: false,
  stops: [
    { id: "a", place: "Delhi, India", nights: 2, country: "India", countryCode: "IN", lat: 28.6, lon: 77.2 },
    { id: "b", place: "Mumbai, India", nights: 3, travelMode: "Flight" },
    { id: "c", place: "Goa, India", nights: 3 },
  ],
};

// Pretend to be the form: state in, validated stops, fields out.
function roundTrip(trip, tweak = (s) => s) {
  const state = tweak(structuredClone(tripToFormState(trip)));
  const route = validateRoute({ stops: state.stops, startingFrom: state.startingFrom, transportation: state.formData.transportation });
  assert.equal(route.ok, true, route.error);
  return buildTripFields({ ...state, stops: route.stops });
}

test("opening a saved trip fills the form with exactly what was saved", () => {
  const s = tripToFormState(multi);
  assert.deepEqual(s.formData, { title: "Loop", category: "Leisure", description: "Beach", budget: "20000", currency: "INR", travelers: 2, startDate: "2027-03-24", interests: ["Beaches"], accommodation: "Hotel", transportation: "Train" });
  assert.deepEqual(s.stops.map((x) => [x.id, x.place, x.nights]), [["a", "Delhi, India", 2], ["b", "Mumbai, India", 3], ["c", "Goa, India", 3]]);
  assert.deepEqual([s.startingFrom, s.end], ["Mumbai", { mode: "elsewhere", place: "Chennai" }]);
  assert.deepEqual(tripToFormState({ ...multi, oneWay: true }).end, { mode: "oneWay", place: "" });
  assert.deepEqual(tripToFormState({ ...multi, endingAt: "" }).end, { mode: "return", place: "" });
});

test("an older trip opens as one stop (nights = days - 1)", () => {
  const s = tripToFormState(legacy);
  assert.deepEqual(s.stops, [{ id: "stop-1", place: "Goa, India", nights: 3 }]);
  assert.equal(s.end.mode, "return");
});

test("garbage in a saved trip never crashes the form", () => {
  for (const bad of [undefined, null, {}, "x", { budget: "abc", travelers: -1, startDate: "soon", interests: "x", stops: 5 }]) {
    const s = tripToFormState(bad);
    assert.equal(s.stops.length, 1);
    assert.deepEqual([s.formData.travelers, s.formData.startDate, s.formData.budget], [1, "", ""]);
  }
});

test("saving without changing anything keeps the route identical (no false 'plan is out of date')", () => {
  for (const trip of [legacy, multi, { ...multi, oneWay: true, endingAt: "" }, { ...legacy, duration: 1 }]) {
    const fields = roundTrip(trip);
    assert.equal(routeChanged(trip, fields), false, trip.title);
    assert.deepEqual(buildUpdate(trip, fields), fields, "no itinerary stamp when nothing changed");
  }
});

test("an unchanged save writes the same trip back (apart from fields it now also stores)", () => {
  const fields = roundTrip(multi);
  assert.deepEqual([fields.title, fields.budget, fields.travelers, fields.startDate, fields.destination, fields.duration, fields.endingAt, fields.oneWay], ["Loop", 20000, 2, "2027-03-24", "Delhi, India", 9, "Chennai", false]);
  assert.deepEqual(fields.stops.map((s) => s.id), ["a", "b", "c"], "stop ids survive, so per-city hotels still match");
  const l = roundTrip(legacy);
  assert.deepEqual([l.destination, l.duration, l.stops.length], ["Goa, India", 4, 1]);
});

test("route edits are detected; title, budget and notes edits are not", () => {
  const edited = (fn) => roundTrip(multi, fn);
  assert.equal(routeChanged(multi, edited((s) => { s.formData.title = "New"; s.formData.budget = "1"; s.formData.description = "x"; s.formData.travelers = 9; return s; })), false);
  assert.equal(routeChanged(multi, edited((s) => { s.stops = moveStop(s.stops, "a", 1); return s; })), true, "reorder");
  assert.equal(routeChanged(multi, edited((s) => { s.stops = updateStop(s.stops, "c", { nights: 5 }); return s; })), true, "nights");
  assert.equal(routeChanged(multi, edited((s) => { s.stops = s.stops.slice(0, 2); return s; })), true, "removed city");
  assert.equal(routeChanged(multi, edited((s) => { s.formData.startDate = "2027-04-01"; return s; })), true, "dates");
  assert.equal(routeChanged(multi, edited((s) => { s.end = { mode: "oneWay", place: "" }; return s; })), true, "one-way");
  assert.equal(routeChanged(multi, edited((s) => { s.startingFrom = "Pune"; return s; })), true, "different start");
});

test("a plan made before route fingerprints existed gets stamped with the OLD route when the route changes", () => {
  const fields = roundTrip(legacy, (s) => { s.stops = updateStop(s.stops, "stop-1", { place: "Bali, Indonesia" }); return s; });
  assert.equal(fields.destination, "Bali, Indonesia");
  const update = buildUpdate(legacy, fields);
  assert.equal(update["itinerary.routeSignature"], routeSignature(legacy));
  // simulate the Firestore dotted-path update and check the page now sees the plan as stale
  const saved = { ...legacy, ...fields, itinerary: { ...legacy.itinerary, routeSignature: update["itinerary.routeSignature"] } };
  assert.equal(isItineraryStale(saved), true);
  assert.equal(isItineraryStale(legacy), false, "before the edit it was fine");
});

test("no stamp when there is no plan, the plan already has a fingerprint, or only non-route fields changed", () => {
  const moved = (t) => roundTrip(t, (s) => { s.stops = moveStop(s.stops, "a", 1); return s; });
  const noPlan = { ...multi, itinerary: undefined };
  assert.ok(!("itinerary.routeSignature" in buildUpdate(noPlan, moved(noPlan))));
  const stamped = { ...multi, itinerary: { summary: "s", days: [], routeSignature: "abc" } };
  assert.ok(!("itinerary.routeSignature" in buildUpdate(stamped, moved(stamped))), "keeps the plan's own fingerprint");
  assert.ok(!("itinerary.routeSignature" in buildUpdate(multi, roundTrip(multi, (s) => { s.formData.title = "x"; return s; }))));
});

test("never writes undefined (Firestore rejects it) and never touches ownership fields", () => {
  const update = buildUpdate(legacy, roundTrip(legacy, (s) => { s.stops = updateStop(s.stops, "stop-1", { place: "Bali" }); return s; }));
  const walk = (v, p = "") => { assert.notEqual(v, undefined, p); if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => walk(x, `${p}.${k}`)); };
  walk(update);
  for (const key of ["userId", "createdAt", "id", "itinerary"]) assert.ok(!(key in update), key);
});
