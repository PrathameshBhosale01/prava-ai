import test from "node:test";
import assert from "node:assert/strict";

import { BUDGET_KEYS, normalizeItinerary } from "../../lib/assistant/itinerary.js";

const day = (over = {}) => ({ day: 1, date: "2026-10-18", title: "Arrive", activities: [{ time: "09:00", title: "Breakfast", description: "Cafe", location: "Panjim" }], ...over });
const base = (over = {}) => ({ summary: "Beach weekend", days: [day()], ...over });

test("a plain (older-style) itinerary keeps EXACTLY its original shape: no new keys appear", () => {
  const out = normalizeItinerary(base());
  assert.deepEqual(Object.keys(out).sort(), ["days", "summary"]);
  assert.deepEqual(Object.keys(out.days[0].activities[0]).sort(), ["description", "location", "time", "title"]);
});

test("rich output is cleaned and kept", () => {
  const out = normalizeItinerary(base({
    accommodations: [{ name: " Hotel  Gracery ", rating: 4, address: "1-19-1 Kabukicho", description: "Near the station", pricePerNight: 18500 }],
    days: [day({ activities: [{ title: "Tower", time: "18:30", rating: 4.5, price: "Free", duration: "1.5 hours", bestTime: "Sunset", travel: "15 minutes walk" }] })],
    budgetBreakdown: { accommodation: 74000, food: 120000, transportation: 35000, activities: 45000, miscellaneous: 11000 },
    localCuisine: ["Sushi", "Ramen"], safetyTips: ["Carry your passport"], packingSuggestions: ["Warm layers"],
    transportationTips: "  Get a Suica card ", bestSeason: "Spring",
  }));
  assert.deepEqual(out.accommodations, [{ name: "Hotel Gracery", rating: 4, address: "1-19-1 Kabukicho", description: "Near the station", pricePerNight: 18500 }]);
  assert.deepEqual(out.days[0].activities[0], { time: "18:30", title: "Tower", description: "", location: "", rating: 4.5, price: "Free", duration: "1.5 hours", bestTime: "Sunset", travel: "15 minutes walk" });
  assert.deepEqual(out.budgetBreakdown, { accommodation: 74000, food: 120000, transportation: 35000, activities: 45000, miscellaneous: 11000 });
  assert.deepEqual([out.localCuisine, out.safetyTips, out.packingSuggestions], [["Sushi", "Ramen"], ["Carry your passport"], ["Warm layers"]]);
  assert.deepEqual([out.transportationTips, out.bestSeason], ["Get a Suica card", "Spring"]);
});

test("numbers the model sends as text are parsed; nonsense is dropped (never shown wrong)", () => {
  const out = normalizeItinerary(base({
    accommodations: [
      { name: "A", pricePerNight: "₹18,500 per night", rating: "4.5 stars" },
      { name: "B", pricePerNight: "2500-4000", rating: "9.8/10" },
      { name: "C", pricePerNight: -5, rating: 7 },
      { name: "D", pricePerNight: "free", rating: null },
      { name: "E", pricePerNight: Infinity, rating: NaN },
    ],
  }));
  const [a, b, c, d, e] = out.accommodations;
  assert.deepEqual([a.pricePerNight, a.rating], [18500, 4.5]);
  assert.deepEqual([b.pricePerNight, b.rating], [2500, undefined], "ranges use the first number; a 0–10 style rating is dropped");
  for (const hotel of [c, d, e]) assert.deepEqual(Object.keys(hotel), ["name"], "invalid values are omitted, not zeroed");
});

test("accommodations: nameless dropped, capped at 6, empty list omitted entirely", () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ name: `Hotel ${i}` }));
  assert.equal(normalizeItinerary(base({ accommodations: [{ rating: 5 }, ...many] })).accommodations.length, 6);
  assert.ok(!("accommodations" in normalizeItinerary(base({ accommodations: [{ rating: 5 }, null, "x"] }))));
  assert.ok(!("accommodations" in normalizeItinerary(base({ accommodations: "nope" }))));
});

test("budget: aliases are understood, same-bucket aliases are summed, junk ignored, all-junk omitted", () => {
  const out = normalizeItinerary(base({ budgetBreakdown: { Hotels: "₹50,000", stay: 10000, DINING: 3000, transport: 2000, misc: "500", souvenirs: 99999, food: "lots" } }));
  assert.deepEqual(out.budgetBreakdown, { accommodation: 60000, food: 3000, transportation: 2000, miscellaneous: 500 });
  for (const bad of [{}, { souvenirs: 5 }, { food: "none" }, [], "x", null]) assert.ok(!("budgetBreakdown" in normalizeItinerary(base({ budgetBreakdown: bad }))), JSON.stringify(bad));
  assert.deepEqual(BUDGET_KEYS, ["accommodation", "food", "transportation", "activities", "miscellaneous"]);
});

test("lists: trimmed, case-insensitively de-duplicated, capped, non-strings dropped", () => {
  const out = normalizeItinerary(base({
    localCuisine: [" Sushi ", "sushi", "SUSHI", 5, null, { a: 1 }, "Ramen", ...Array.from({ length: 20 }, (_, i) => `Dish ${i}`)],
    safetyTips: "not a list", packingSuggestions: [],
  }));
  assert.equal(out.localCuisine.length, 10);
  assert.deepEqual(out.localCuisine.slice(0, 2), ["Sushi", "Ramen"]);
  assert.ok(!("safetyTips" in out) && !("packingSuggestions" in out));
});

test("long text is capped, HTML is left as inert text", () => {
  const out = normalizeItinerary(base({ bestSeason: "x".repeat(2000), transportationTips: "<script>alert(1)</script>" }));
  assert.equal(out.bestSeason.length, 700);
  assert.equal(out.transportationTips, "<script>alert(1)</script>", "kept as a plain string; React escapes it on render");
});

test("normalizing is idempotent: already-clean (stored) data comes back unchanged", () => {
  const messy = base({
    accommodations: [{ name: "A", pricePerNight: "₹1,000", rating: "4.5 stars" }],
    budgetBreakdown: { hotels: 10, food: "5" },
    localCuisine: ["a", "A"],
    days: [day({ activities: [{ title: "T", rating: "4", price: "Free" }] })],
    bestSeason: " spring ",
  });
  const once = normalizeItinerary(messy);
  assert.deepEqual(normalizeItinerary(once), once);
});

test("the original strictness is intact", () => {
  assert.throws(() => normalizeItinerary({ days: [] }), /no usable days/);
  assert.throws(() => normalizeItinerary(null), /Invalid/);
  assert.throws(() => normalizeItinerary({ summary: "x", days: [{ day: 1, activities: [] }], accommodations: [{ name: "A" }] }), /no usable days/);
});
