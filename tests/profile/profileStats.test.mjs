import test from "node:test";
import assert from "node:assert/strict";

import { getFeedbackHref } from "../../lib/appConfig.js";
import { computeTripStats, getMeterPercent, getMeterTone } from "../../lib/profileStats.js";

test("computeTripStats counts trips, itineraries and distinct destinations", () => {
  const stats = computeTripStats([
    { destination: "Goa", itinerary: { days: [{}] } },
    { destination: " goa ", itinerary: null },
    { destination: "Bali", itinerary: [{ day: 1 }] },
    { destination: "", itinerary: {} },
  ]);
  assert.deepEqual(stats, { trips: 4, itineraries: 2, destinations: 2 });
});

test("computeTripStats ignores empty destinations and tolerates bad input", () => {
  assert.deepEqual(computeTripStats([{ destination: "   " }, {}]), {
    trips: 2,
    itineraries: 0,
    destinations: 0,
  });
  assert.deepEqual(computeTripStats(undefined), { trips: 0, itineraries: 0, destinations: 0 });
  assert.deepEqual(computeTripStats(null), { trips: 0, itineraries: 0, destinations: 0 });
});

test("computeTripStats collapses spacing and case in destination names", () => {
  const stats = computeTripStats([
    { destination: "New   Delhi" },
    { destination: "new delhi" },
    { destination: "NEW DELHI " },
  ]);
  assert.equal(stats.destinations, 1);
});

test("getMeterTone escalates as the limit is approached", () => {
  assert.equal(getMeterTone({ used: 0, limit: 3 }), "primary");
  assert.equal(getMeterTone({ used: 1, limit: 3 }), "primary");
  assert.equal(getMeterTone({ used: 2, limit: 3 }), "warning"); // one left
  assert.equal(getMeterTone({ used: 3, limit: 3 }), "danger");
  assert.equal(getMeterTone({ used: 4, limit: 3 }), "danger");
  assert.equal(getMeterTone({ used: 31, limit: 40 }), "primary");
  assert.equal(getMeterTone({ used: 32, limit: 40 }), "warning"); // 80%
  assert.equal(getMeterTone({ used: 0, limit: 0 }), "primary");
});

test("getMeterPercent is clamped to 0-100", () => {
  assert.equal(getMeterPercent({ used: 1, limit: 4 }), 25);
  assert.equal(getMeterPercent({ used: 9, limit: 3 }), 100);
  assert.equal(getMeterPercent({ used: -2, limit: 3 }), 0);
  assert.equal(getMeterPercent({ used: 2, limit: 0 }), 0);
});

test("getFeedbackHref builds an encoded mailto link", () => {
  assert.equal(
    getFeedbackHref("me@example.com"),
    "mailto:me@example.com?subject=Prava%20AI%20feedback"
  );
});