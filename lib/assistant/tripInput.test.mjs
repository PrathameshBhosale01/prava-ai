import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTripInput } from "../../lib/assistant/tripInput.js";
import { addDaysToKey, dateKey, isValidDateKey } from "../../lib/assistant/dates.js";

// 2026-10-04 12:00 IST
const NOW = new Date("2026-10-04T06:30:00Z");

const valid = {
  destination: "Goa, India",
  startingFrom: "Mumbai",
  duration: 3,
  budget: 15000,
  currency: "inr",
  travelers: 2,
};

test("dateKey uses the requested timezone", () => {
  assert.equal(dateKey(new Date("2026-10-04T20:00:00Z"), "Asia/Kolkata"), "2026-10-05");
  assert.equal(dateKey(new Date("2026-10-04T20:00:00Z"), "UTC"), "2026-10-04");
});

test("date key helpers", () => {
  assert.equal(isValidDateKey("2026-02-30"), false);
  assert.equal(isValidDateKey("2026-10-04"), true);
  assert.equal(isValidDateKey("tomorrow"), false);
  assert.equal(addDaysToKey("2026-12-25", 10), "2027-01-04");
});

test("accepts valid input and fills defaults", () => {
  const result = normalizeTripInput(valid, { now: NOW });
  assert.equal(result.ok, true);
  assert.deepEqual(result.trip, {
    title: "3-Day Goa Trip",
    category: "Leisure",
    description: "",
    destination: "Goa, India",
    startingFrom: "Mumbai",
    budget: 15000,
    currency: "INR",
    duration: 3,
    travelers: 2,
    startDate: "2026-10-18",
    interests: [],
    accommodation: "Hotel",
    transportation: "Mixed",
  });
});

test("solo travellers default to the Solo category", () => {
  const result = normalizeTripInput({ ...valid, travelers: 1 }, { now: NOW });
  assert.equal(result.trip.category, "Solo");
});

test("coerces numeric strings and legacy field names", () => {
  const result = normalizeTripInput(
    { destination: "Bali", source: "Delhi", days: "5", budget: "₹ 50,000", currency: "INR", persons: "2" },
    { now: NOW },
  );
  assert.equal(result.ok, true);
  assert.equal(result.trip.startingFrom, "Delhi");
  assert.equal(result.trip.duration, 5);
  assert.equal(result.trip.budget, 50000);
  assert.equal(result.trip.travelers, 2);
});

test("keeps only known interests and options, case-insensitively", () => {
  const result = normalizeTripInput(
    {
      ...valid,
      interests: ["beaches", "Beaches", "Skydiving", "food & dining"],
      accommodation: "villa",
      transportation: "SPACESHIP",
      category: "honeymoon",
    },
    { now: NOW },
  );
  assert.deepEqual(result.trip.interests, ["Beaches", "Food & Dining"]);
  assert.equal(result.trip.accommodation, "Villa");
  assert.equal(result.trip.transportation, "Mixed");
  assert.equal(result.trip.category, "Honeymoon");
});

test("respects a valid future start date and rejects past or invalid ones", () => {
  assert.equal(normalizeTripInput({ ...valid, startDate: "2026-12-01" }, { now: NOW }).trip.startDate, "2026-12-01");
  assert.equal(normalizeTripInput({ ...valid, startDate: "2026-01-01" }, { now: NOW }).trip.startDate, "2026-10-18");
  assert.equal(normalizeTripInput({ ...valid, startDate: "next week" }, { now: NOW }).trip.startDate, "2026-10-18");
});

test("rejects missing or out-of-range required fields with friendly errors", () => {
  const cases = [
    [{ ...valid, destination: "  " }, /destination/i],
    [{ ...valid, startingFrom: undefined }, /starting/i],
    [{ ...valid, duration: 0 }, /1 to 21 days/],
    [{ ...valid, duration: 400 }, /1 to 21 days/],
    [{ ...valid, budget: -5 }, /budget/i],
    [{ ...valid, currency: "XYZ" }, /currency/i],
    [{ ...valid, travelers: 0 }, /people/i],
  ];
  for (const [input, pattern] of cases) {
    const result = normalizeTripInput(input, { now: NOW });
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.match(result.error, pattern);
  }
});

test("survives garbage input", () => {
  for (const input of [null, undefined, "x", 42, []]) {
    assert.equal(normalizeTripInput(input, { now: NOW }).ok, false);
  }
});

test("trims and truncates free text", () => {
  const result = normalizeTripInput(
    { ...valid, title: "  A   very\n spaced  title ", description: "x".repeat(900) },
    { now: NOW },
  );
  assert.equal(result.trip.title, "A very spaced title");
  assert.equal(result.trip.description.length, 500);
});