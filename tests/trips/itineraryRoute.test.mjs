import test from "node:test";
import assert from "node:assert/strict";

import { generateItinerary } from "../../lib/assistant/gemini.js";
import { ItineraryFormatError, normalizeItinerary } from "../../lib/assistant/itinerary.js";
import { adaptModelOutput } from "../../lib/assistant/itineraryRoute.js";
import { buildItineraryPrompt } from "../../lib/itineraryPrompt.js";
import { isItineraryStale, moveStop, routeSignature } from "../../lib/trips/stops.js";

const trip = {
  title: "India loop", startingFrom: "Pune", category: "Leisure", description: "", budget: 200000, currency: "INR", travelers: 2,
  startDate: "2027-03-24", interests: ["Food & Dining"], accommodation: "Hotel", transportation: "Mixed",
  stops: [
    { id: "a", place: "Delhi, India", nights: 2, country: "India", countryCode: "IN" },
    { id: "b", place: "Mumbai, India", nights: 3, travelMode: "Flight", country: "India", countryCode: "IN" },
    { id: "c", place: "Goa, India", nights: 3, travelMode: "Train", country: "India", countryCode: "IN" },
    { id: "d", place: "Chennai, India", nights: 2, travelMode: "Flight", country: "India", countryCode: "IN" },
  ],
}; // 11 days: Delhi 1-2, Mumbai 3-5, Goa 6-8, Chennai 9-11

const dayOf = (n, over = {}) => ({ day: n, date: "1999-01-01", title: `Day ${n}`, activities: [{ time: "09:00", title: `Thing ${n}`, location: "somewhere" }], ...over });
const modelOutput = (over = {}) => ({
  summary: "Four cities",
  transfers: [
    { leg: 1, mode: "Train", duration: "28 hours", price: "₹6,000", notes: "Book early" },
    { leg: 2, mode: "Flight", duration: "2h 10m", price: 9000 },
    { leg: 3, duration: "10 hours" },
    { leg: 4, mode: "Flight", price: 7000 },
    { leg: 5, mode: "Flight", price: 8000 },
  ],
  accommodations: [
    { stop: 1, name: "Delhi Inn", pricePerNight: 5000 }, { stop: 1, name: "Delhi Two" }, { stop: 1, name: "Delhi Three" }, { stop: 1, name: "Delhi Four" },
    { stop: 2, name: "Mumbai Inn", pricePerNight: 8000 }, { stop: 4, name: "Chennai Inn" },
    { stop: 9, name: "Nowhere Inn" }, { name: "No Stop Inn" },
  ],
  days: Array.from({ length: 11 }, (_, i) => dayOf(i + 1)),
  budgetByStop: [{ stop: 1, accommodation: 10000, food: 4000 }, { stop: 3, food: "₹3,000" }, { stop: 7, food: 1 }, { stop: 2 }],
  budgetBreakdown: { accommodation: 60000, food: 30000, transportation: 30000, activities: 20000, miscellaneous: 5000 },
  ...over,
});
const adapt = (raw = modelOutput(), t = trip) => normalizeItinerary(adaptModelOutput(raw, t));

/* --------------------------------- day stamping --------------------------------- */

test("every day is stamped with its city, date and stop id from the app's schedule (not the model's)", () => {
  const out = adapt();
  assert.equal(out.days.length, 11);
  assert.deepEqual(out.days.map((d) => d.day), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(out.days.map((d) => d.city), ["Delhi", "Delhi", "Mumbai", "Mumbai", "Mumbai", "Goa", "Goa", "Goa", "Chennai", "Chennai", "Chennai"]);
  assert.deepEqual(out.days.map((d) => d.stopId), ["a", "a", "b", "b", "b", "c", "c", "c", "d", "d", "d"]);
  assert.equal(out.days[0].date, "2027-03-24", "the model's made-up 1999 date is overwritten");
  assert.equal(out.days[10].date, "2027-04-03");
  assert.equal(out.days[0].title, "Day 1", "the model's content is kept");
});

test("model numbering mess is repaired: out-of-order days, extra days, and a day without a number", () => {
  const shuffled = modelOutput({ days: [...Array.from({ length: 11 }, (_, i) => dayOf(i + 1)), dayOf(12), dayOf(13)].reverse() });
  const out = adapt(shuffled);
  assert.deepEqual(out.days.map((d) => d.day), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(out.days[4].activities[0].title, "Thing 5");
  const unnumbered = modelOutput({ days: Array.from({ length: 11 }, (_, i) => dayOf(i + 1, { day: undefined })) });
  assert.equal(adapt(unnumbered).days[7].activities[0].title, "Thing 8", "falls back to list position");
});

test("a missing or empty day is a FORMAT error, so generateItinerary retries instead of saving a broken plan", () => {
  const missing = modelOutput({ days: Array.from({ length: 11 }, (_, i) => dayOf(i + 1)).filter((d) => d.day !== 7) });
  assert.throws(() => adapt(missing), (e) => e instanceof ItineraryFormatError && /Day 7 is missing/.test(e.message));
  const empty = modelOutput({ days: Array.from({ length: 11 }, (_, i) => dayOf(i + 1, i === 3 ? { activities: [{ title: "  " }] } : {})) });
  assert.throws(() => adapt(empty), /Day 4 is missing/);
  assert.throws(() => adapt(modelOutput({ days: "nope" })), ItineraryFormatError);
});

/* ---------------------------------- journeys ---------------------------------- */

test("journeys land on the right days, with the model's details when it gave them", () => {
  const out = adapt();
  const transfers = out.days.filter((d) => d.transfer).map((d) => [d.day, d.transfer.from, d.transfer.to]);
  assert.deepEqual(transfers, [[1, "Pune", "Delhi"], [3, "Delhi", "Mumbai"], [6, "Mumbai", "Goa"], [9, "Goa", "Chennai"], [11, "Chennai", "Pune"]]);
  assert.deepEqual(out.days[0].transfer, { from: "Pune", to: "Delhi", mode: "Train", duration: "28 hours", price: 6000, notes: "Book early" });
  assert.deepEqual(out.days[2].transfer, { from: "Delhi", to: "Mumbai", mode: "Flight", duration: "2h 10m", price: 9000 });
});

test("a journey the model skipped or half-described still exists, with the planned mode", () => {
  const out = adapt();
  assert.deepEqual(out.days[5].transfer, { from: "Mumbai", to: "Goa", mode: "Train", duration: "10 hours" }, "mode comes from the route, price is simply absent");
  const none = adapt(modelOutput({ transfers: undefined }));
  assert.equal(none.days.filter((d) => d.transfer).length, 5);
  assert.deepEqual(none.days[10].transfer, { from: "Chennai", to: "Pune", mode: "Mixed" });
  const junk = adapt(modelOutput({ transfers: [null, "x", { leg: 99, mode: "Rocket" }, { leg: "2", price: "free" }] }));
  assert.equal(junk.days[2].transfer.mode, "Flight");
  assert.ok(!("price" in junk.days[2].transfer));
});

test("one-way and open-jaw trips get the right final journey", () => {
  assert.equal(adapt(modelOutput({ transfers: [] }), { ...trip, oneWay: true }).days.filter((d) => d.transfer).length, 4);
  const jaw = adapt(modelOutput({ transfers: [] }), { ...trip, endingAt: "Bengaluru" });
  assert.deepEqual([jaw.days[10].transfer.from, jaw.days[10].transfer.to], ["Chennai", "Bengaluru"]);
});

/* ------------------------------ hotels and budgets ------------------------------ */

test("hotels are tied to their city; unplaceable ones are dropped; at most 3 per city", () => {
  const out = adapt();
  assert.deepEqual(out.accommodations.map((h) => [h.stopId, h.name]), [["a", "Delhi Inn"], ["a", "Delhi Two"], ["a", "Delhi Three"], ["b", "Mumbai Inn"], ["d", "Chennai Inn"]]);
});

test("per-city budgets are tied to the city; empty and unknown ones are dropped", () => {
  assert.deepEqual(adapt().budgetByStop, [{ stopId: "a", accommodation: 10000, food: 4000 }, { stopId: "c", food: 3000 }]);
  assert.ok(!("budgetByStop" in adapt(modelOutput({ budgetByStop: "x" }))));
});

/* -------------------------------- stale detection -------------------------------- */

test("the plan carries the route's fingerprint; reordering the trip afterwards makes it stale", () => {
  const out = adapt();
  assert.equal(out.routeSignature, routeSignature(trip));
  assert.equal(isItineraryStale({ ...trip, itinerary: out }), false);
  assert.equal(isItineraryStale({ ...trip, stops: moveStop(trip.stops, "a", 1), itinerary: out }), true);
});

/* ------------------------------ storing and re-reading ------------------------------ */

test("a stamped plan survives being validated again (this is what the details page does)", () => {
  const once = adapt();
  assert.deepEqual(normalizeItinerary(once), once);
  assert.equal(once.days[0].transfer.price, 6000);
});

test("the stored-shape fields are validated too (a corrupted document can't crash the page)", () => {
  const out = normalizeItinerary({
    summary: "s",
    routeSignature: "x".repeat(100),
    budgetByStop: [{ stopId: "a", food: -5 }, null, { food: 5 }],
    accommodations: [{ name: "H", stopId: 42 }],
    days: [{ day: 1, activities: [{ title: "t" }], stopId: { evil: 1 }, city: "<b>C</b>", transfer: { from: "A" } }, { day: 2, activities: [{ title: "t" }], transfer: { from: "A", to: "B", price: "abc", mode: 5 } }],
  });
  assert.equal(out.routeSignature.length, 24);
  assert.ok(!("budgetByStop" in out));
  assert.ok(!("stopId" in out.days[0]) && !("transfer" in out.days[0]));
  assert.equal(out.days[0].city, "<b>C</b>", "kept as plain text; React escapes it");
  assert.deepEqual(out.days[1].transfer, { from: "A", to: "B" });
});

/* --------------------------- backward compatibility --------------------------- */

test("one-city trips are not touched: wrong day counts are still accepted, nothing is stamped but the fingerprint", () => {
  const single = { ...trip, stops: [{ id: "x", place: "Goa, India", nights: 4 }], startingFrom: "Pune" }; // 5 days
  const raw = { summary: "s", days: [dayOf(1, { date: "2027-03-24" }), dayOf(2)] }; // model returned only 2 days
  const out = adapt(raw, single);
  assert.equal(out.days.length, 2);
  assert.deepEqual(Object.keys(out).sort(), ["days", "routeSignature", "summary"]);
  assert.ok(out.days.every((d) => !("stopId" in d) && !("city" in d) && !("transfer" in d)));
  assert.deepEqual(adapt(raw, { destination: "Goa", duration: 5, startingFrom: "Pune", startDate: "2027-03-24" }).days.length, 2, "older trips with no stops too");
});

test("garbage from the model still fails with the usual errors", () => {
  for (const bad of [null, undefined, [], "x", 5]) assert.throws(() => normalizeItinerary(adaptModelOutput(bad, trip)), ItineraryFormatError);
});

/* ------------------------------------ prompt ------------------------------------ */

test("the multi-city prompt spells out the route, journeys, day count and cross-border advice", () => {
  const prompt = buildItineraryPrompt(trip);
  assert.match(prompt, /Stop 1: Delhi, India: days 1-2 \(Mar 24 – Mar 25, 2027\), 2 nights, check-in 2027-03-24, check-out 2027-03-26/);
  assert.match(prompt, /Stop 4: Chennai, India: days 9-11 \(Apr 1 – Apr 3, 2027\)/);
  assert.match(prompt, /Journey 1: Pune to Delhi, India, on day 1 \(2027-03-24\), by Mixed/);
  assert.match(prompt, /Journey 3: Mumbai, India to Goa, India, on day 6 \(2027-03-29\), by Train/);
  assert.match(prompt, /JOURNEYS \(5\)/);
  assert.match(prompt, /exactly 11 entries, numbered 1 to 11/);
  assert.match(prompt, /ends with the journey back home to Pune on day 11/);
  assert.doesNotMatch(prompt, /crosses borders/, "all stops are in India");
  assert.match(prompt, /ALL 2 traveler/);
});

test("prompt variants: one-way, open-jaw, international", () => {
  assert.match(buildItineraryPrompt({ ...trip, oneWay: true }), /one-way: it ends in Chennai, India on day 11 with no return journey/);
  assert.match(buildItineraryPrompt({ ...trip, oneWay: true }), /JOURNEYS \(4\)/);
  assert.match(buildItineraryPrompt({ ...trip, endingAt: "Bengaluru" }), /ends in Bengaluru on day 11 \(a different city from the start\)/);
  const intl = buildItineraryPrompt({ ...trip, stops: [trip.stops[0], { id: "t", place: "Bangkok, Thailand", nights: 2, country: "Thailand", countryCode: "TH" }] });
  assert.match(intl, /crosses borders \(India, Thailand\)/);
  assert.match(intl, /verify them with the official source/);
});

test("a one-city trip gets exactly the original prompt (no route section)", () => {
  const prompt = buildItineraryPrompt({ ...trip, stops: undefined, destination: "Goa, India", duration: 5 });
  assert.doesNotMatch(prompt, /ROUTE|JOURNEYS|transfers/);
  assert.match(prompt, /Destination:\nGoa, India/);
  assert.match(prompt, /Respect the trip duration/);
});

/* ----------------------------- generateItinerary end to end ----------------------------- */

test("generateItinerary asks again when a multi-city plan is missing a day, then returns the stamped plan", async () => {
  const short = modelOutput({ days: Array.from({ length: 10 }, (_, i) => dayOf(i + 1)) });
  const replies = [JSON.stringify(short), "```json\n" + JSON.stringify(modelOutput()) + "\n```"];
  let calls = 0;
  const ai = { models: { generateContent: async () => ({ text: replies[Math.min(calls++, 1)] }) } };
  const out = await generateItinerary({ ai, models: ["m1"], trip, retryDelayMs: 0 });
  assert.equal(calls, 2);
  assert.equal(out.days.length, 11);
  assert.equal(out.days[2].city, "Mumbai");
  assert.equal(out.routeSignature, routeSignature(trip));
});

test("generateItinerary gives up with the missing-day error if the model never gets it right", async () => {
  const ai = { models: { generateContent: async () => ({ text: JSON.stringify(modelOutput({ days: [dayOf(1)] })) }) } };
  await assert.rejects(generateItinerary({ ai, models: ["m1"], trip, retryDelayMs: 0 }), /Day 2 is missing/);
});
