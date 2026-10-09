import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInboxQuery,
  countByStatus,
  daysUntil,
  filterTrips,
  formatBudget,
  formatDuration,
  getTripStatus,
  matchesQuery,
  normalizeInboxTrip,
  paginate,
  parseDateOnly,
  parseInboxParams,
  uniqueCategories,
} from "../../lib/tripInbox.js";

const NOW = new Date(2026, 9, 7); // 7 Oct 2026

const make = (over) =>
  normalizeInboxTrip(
    {
      id: "t",
      title: "Trip",
      destination: "Goa",
      category: "Leisure",
      budget: 1000,
      duration: 3,
      startDate: "2026-12-01",
      createdAt: new Date(2026, 7, 1),
      ...over,
    },
    NOW
  );

test("parseDateOnly keeps the local calendar day", () => {
  const d = parseDateOnly("2026-08-08");
  assert.equal(d.getDate(), 8);
  assert.equal(d.getMonth(), 7);
  assert.equal(parseDateOnly(""), null);
});

test("formatBudget formats currency and handles bad input", () => {
  assert.equal(formatBudget(45500, "INR"), "₹45,500");
  assert.equal(formatBudget(0), "—");
  assert.equal(formatBudget("abc"), "—");
  assert.match(formatBudget(1200, "NOPE"), /1,200/);
});

test("formatDuration pluralizes", () => {
  assert.equal(formatDuration(1), "1 day");
  assert.equal(formatDuration(5), "5 days");
  assert.equal(formatDuration(0), "—");
});

test("getTripStatus covers every state", () => {
  const start = (s) => parseDateOnly(s);
  assert.equal(getTripStatus({ startDate: start("2026-10-20"), days: 3 }, NOW), "upcoming");
  assert.equal(getTripStatus({ startDate: start("2026-10-05"), days: 5 }, NOW), "ongoing");
  assert.equal(getTripStatus({ startDate: start("2026-10-07"), days: 1 }, NOW), "ongoing");
  assert.equal(getTripStatus({ startDate: start("2026-09-01"), days: 3 }, NOW), "completed");
  assert.equal(getTripStatus({ startDate: null, days: 3 }, NOW), "unscheduled");
});

test("daysUntil is null unless the trip is in the future", () => {
  assert.equal(daysUntil(parseDateOnly("2026-10-10"), NOW), 3);
  assert.equal(daysUntil(parseDateOnly("2026-10-07"), NOW), null);
  assert.equal(daysUntil(null, NOW), null);
});

test("normalizeInboxTrip applies safe defaults", () => {
  const t = normalizeInboxTrip({ id: "x" }, NOW);
  assert.equal(t.title, "Untitled trip");
  assert.equal(t.destination, "Unknown destination");
  assert.deepEqual(t.interests, []);
  assert.equal(t.travelers, 1);
  assert.equal(t.status, "unscheduled");
  assert.equal(t.hasItinerary, false);
  assert.equal(make({ itinerary: { days: [] } }).hasItinerary, true);
});

test("normalizeInboxTrip de-duplicates destination", () => {
  assert.equal(make({ destination: "Japan, Japan" }).destination, "Japan");
});

test("matchesQuery requires every word across fields", () => {
  const trip = make({ title: "Keral Trip", destination: "Kochi, Munnar", interests: ["Nature & Outdoors"] });
  assert.ok(matchesQuery(trip, ""));
  assert.ok(matchesQuery(trip, "munnar"));
  assert.ok(matchesQuery(trip, "KERAL nature"));
  assert.ok(!matchesQuery(trip, "munnar paris"));
});

test("filterTrips filters by status and category and sorts", () => {
  const trips = [
    make({ id: "a", title: "Bravo", budget: 500, category: "Family", startDate: "2026-11-01", createdAt: new Date(2026, 0, 1) }),
    make({ id: "b", title: "Alpha", budget: 900, category: "Solo", startDate: "2026-09-01", createdAt: new Date(2026, 5, 1) }),
    make({ id: "c", title: "Charlie", budget: 100, category: "Family", startDate: "", createdAt: new Date(2026, 3, 1) }),
  ];

  const ids = (opts) => filterTrips(trips, opts).map((t) => t.id);

  assert.deepEqual(ids({ sort: "newest" }), ["b", "c", "a"]);
  assert.deepEqual(ids({ sort: "oldest" }), ["a", "c", "b"]);
  assert.deepEqual(ids({ sort: "budget" }), ["b", "a", "c"]);
  assert.deepEqual(ids({ sort: "name" }), ["b", "a", "c"]);
  assert.deepEqual(ids({ sort: "start" }), ["b", "a", "c"]); // unscheduled last
  assert.deepEqual(ids({ category: "Family", sort: "name" }), ["a", "c"]);
  assert.deepEqual(ids({ status: "completed" }), ["b"]);
  assert.deepEqual(ids({ query: "alp" }), ["b"]);
});

test("filterTrips does not mutate its input", () => {
  const trips = [make({ id: "a", title: "B" }), make({ id: "b", title: "A" })];
  filterTrips(trips, { sort: "name" });
  assert.equal(trips[0].id, "a");
});

test("countByStatus and uniqueCategories", () => {
  const trips = [
    make({ startDate: "2026-12-01", category: "Solo" }),
    make({ startDate: "2026-01-01", category: "Family" }),
    make({ startDate: "", category: "Solo" }),
  ];
  assert.deepEqual(countByStatus(trips), { all: 3, upcoming: 1, ongoing: 0, completed: 1, unscheduled: 1 });
  assert.deepEqual(uniqueCategories(trips), ["Family", "Solo"]);
});

test("paginate slices and clamps", () => {
  const items = Array.from({ length: 13 }, (_, i) => i);
  assert.deepEqual(paginate(items, 1, 6).items, [0, 1, 2, 3, 4, 5]);
  assert.equal(paginate(items, 3, 6).items.length, 1);
  assert.equal(paginate(items, 99, 6).page, 3);
  assert.equal(paginate(items, -4, 6).page, 1);
  const empty = paginate([], 1, 6);
  assert.equal(empty.totalPages, 1);
  assert.equal(empty.total, 0);
});

test("parseInboxParams reads valid params", () => {
  const state = parseInboxParams(
    new URLSearchParams("q=  kerala  &status=upcoming&type=Family&sort=budget&page=3")
  );
  assert.deepEqual(state, { query: "kerala", status: "upcoming", category: "Family", sort: "budget", page: 3 });
});

test("parseInboxParams falls back to defaults for bad input", () => {
  const state = parseInboxParams(new URLSearchParams("status=hacked&sort=nope&page=-4"));
  assert.deepEqual(state, { query: "", status: "all", category: "all", sort: "newest", page: 1 });
  assert.equal(parseInboxParams(new URLSearchParams("page=abc")).page, 1);
  assert.equal(parseInboxParams(null).status, "all");
});

test("buildInboxQuery omits defaults and round-trips", () => {
  assert.equal(buildInboxQuery({}), "");
  assert.equal(buildInboxQuery({ query: "  " , page: 1 }), "");

  const state = { query: "goa beach", status: "completed", category: "Solo", sort: "name", page: 2 };
  const qs = buildInboxQuery(state);
  assert.ok(qs.includes("q=goa+beach") && qs.includes("page=2"));
  assert.deepEqual(parseInboxParams(new URLSearchParams(qs)), state);
});
