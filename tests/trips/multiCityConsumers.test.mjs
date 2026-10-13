import test from "node:test";
import assert from "node:assert/strict";

import { matchesQuery, normalizeInboxTrip } from "../../lib/tripInbox.js";
import { computeTripStats } from "../../lib/profileStats.js";
import { computeSummary, normalizeTrip } from "../../lib/insights.js";
import { normalizeTripInput } from "../../lib/assistant/tripInput.js";
import { toApiMessages } from "../../lib/assistant/chatUtils.js";
import { buildTripTool } from "../../lib/assistant/prompt.js";

const NOW = new Date("2026-10-01T10:00:00Z");
const multi = {
  id: "m",
  title: "Thailand run",
  destination: "Bangkok, Thailand",
  duration: 8,
  stops: [
    { id: "a", place: "Bangkok, Thailand", nights: 3 },
    { id: "b", place: "Phuket, Thailand", nights: 4 },
  ],
};
const base = { startingFrom: "Delhi, India", budget: 90000, currency: "INR", travelers: 2 };

test("inbox: multi-city trip gets route label, badge and searchable places", () => {
  const t = normalizeInboxTrip(multi);
  assert.equal(t.routeLabel, "Bangkok → Phuket");
  assert.equal(t.routeBadge, "2 cities");
  assert.ok(matchesQuery(t, "phuket"));
  assert.ok(!matchesQuery(t, "goa"));
});

test("inbox: legacy single-destination trip is unchanged", () => {
  const t = normalizeInboxTrip({ id: "x", destination: "Goa, India", duration: 4 });
  assert.equal(t.routeLabel, "");
  assert.equal(t.routeBadge, "");
  assert.equal(t.destination, "Goa, India");
  assert.ok(matchesQuery(t, "goa"));
});

test("profile stats: counts every distinct city", () => {
  const stats = computeTripStats([multi, { destination: "phuket, thailand" }, { destination: "Goa" }]);
  assert.equal(stats.destinations, 3);
});

test("insights: favourite destination counts each city and shares cost", () => {
  const trips = [multi, { destination: "Phuket, Thailand", duration: 3 }].map((raw) => normalizeTrip({ ...raw, budget: 1000 }));
  assert.equal(trips[0].routeLabel, "Bangkok → Phuket");
  assert.equal(computeSummary({ trips }).favourite, "Phuket");
  assert.equal(normalizeTrip({ destination: "Goa, India", budget: 5 }).routeLabel, "");
});

test("assistant: single destination input is unchanged", () => {
  const r = normalizeTripInput({ ...base, destination: "Goa, India", duration: 4 }, { now: NOW });
  assert.ok(r.ok);
  assert.equal(r.trip.stops, undefined);
  assert.equal(r.trip.title, "4-Day Goa Trip");
});

test("assistant: multi-city stops set destination, duration and title", () => {
  const r = normalizeTripInput(
    { ...base, destination: "x", duration: 99, stops: [{ place: "Bangkok, Thailand", nights: 3 }, { place: "Phuket, Thailand", nights: 4 }], oneWay: true },
    { now: NOW },
  );
  assert.ok(r.ok);
  assert.equal(r.trip.destination, "Bangkok, Thailand");
  assert.equal(r.trip.duration, 8);
  assert.equal(r.trip.title, "8-Day Bangkok & Phuket Trip");
  assert.equal(r.trip.oneWay, true);
  assert.equal(r.trip.stops.length, 2);
});

test("assistant: missing nights are shared out from the duration", () => {
  const r = normalizeTripInput({ ...base, duration: 8, stops: [{ place: "Delhi" }, { place: "Mumbai" }, { place: "Goa" }] }, { now: NOW });
  assert.ok(r.ok);
  assert.deepEqual(r.trip.stops.map((s) => s.nights), [3, 2, 2]);
  assert.equal(r.trip.duration, 8);
});

test("assistant: bad multi-city input gives a friendly error", () => {
  const noNights = normalizeTripInput({ ...base, stops: [{ place: "A" }, { place: "B" }] }, { now: NOW });
  assert.equal(noNights.ok, false);
  const tooLong = normalizeTripInput({ ...base, stops: [{ place: "A", nights: 15 }, { place: "B", nights: 15 }] }, { now: NOW });
  assert.equal(tooLong.ok, false);
  assert.match(tooLong.error, /21 days/);
  const oneStop = normalizeTripInput({ ...base, destination: "Goa", duration: 3, stops: [{ place: "Goa", nights: 2 }] }, { now: NOW });
  assert.ok(oneStop.ok);
  assert.equal(oneStop.trip.stops, undefined);
});

test("assistant: tool schema offers stops; history mentions the route", () => {
  const props = buildTripTool().functionDeclarations[0].parametersJsonSchema.properties;
  assert.ok(props.stops && props.endingAt && props.oneWay);
  const r = normalizeTripInput({ ...base, stops: [{ place: "Bangkok, Thailand", nights: 3 }, { place: "Phuket, Thailand", nights: 4 }] }, { now: NOW });
  const out = toApiMessages([{ role: "assistant", content: "ok", plan: { trip: r.trip } }]);
  assert.match(out[0].content, /8-day plan for Bangkok → Phuket/);
});
