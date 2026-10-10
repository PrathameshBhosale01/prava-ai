import test from "node:test";
import assert from "node:assert/strict";

import {
  activityLinks, addDays, buildItineraryView, exploreUrl, formatDateRange, formatDay, formatMoney,
  hotelLinks, mapsDirectionsUrl, mapsSearchUrl, summarizeBudget, tripEndDate, tripNights,
} from "../../lib/tripDetails.js";

const trip = { title: "Winter Break", destination: "Tokyo, Japan", startingFrom: "Pune", startDate: "2027-03-24", duration: 5, travelers: 2, budget: 285000, currency: "INR" };

test("addDays is plain calendar math (month/year/leap boundaries, no time-zone drift)", () => {
  assert.equal(addDays("2026-10-18", 0), "2026-10-18");
  assert.equal(addDays("2026-10-30", 3), "2026-11-02");
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2027-03-28", 1), "2027-03-29", "DST change day");
  for (const bad of ["", null, undefined, "2026-13-40", "18/10/2026", "soon"]) assert.equal(addDays(bad, 1), "", String(bad));
});

test("date formatting is stable regardless of the machine's time zone", () => {
  assert.equal(formatDay("2027-03-24"), "Wed, Mar 24");
  assert.equal(formatDay("nope"), "");
  assert.equal(formatDateRange("2027-03-24", "2027-03-28"), "Mar 24 – Mar 28, 2027");
  assert.equal(formatDateRange("2027-03-24", "2027-03-24"), "Mar 24, 2027");
  assert.equal(formatDateRange("2027-03-24", ""), "Mar 24, 2027");
  assert.equal(formatDateRange("", "2027-03-28"), "");
});

test("a 5-day trip is 4 nights and ends on day 5; tiny trips never get 0 nights", () => {
  assert.equal(tripNights(trip), 4);
  assert.equal(tripEndDate(trip), "2027-03-28");
  assert.equal(tripNights({ duration: 1 }), 1);
  assert.equal(tripNights({}), 1);
  assert.equal(tripEndDate({ startDate: "2027-03-24", duration: 1 }), "2027-03-24");
  assert.equal(tripEndDate({}), "");
});

test("money: INR groups the Indian way, others use US grouping, bad currency codes don't throw", () => {
  assert.equal(formatMoney(18500, "INR"), "₹18,500");
  assert.equal(formatMoney(285000, "INR"), "₹2,85,000");
  assert.equal(formatMoney(1234.6, "USD"), "$1,235");
  assert.equal(formatMoney(5000, "NOT-A-CODE"), "NOT-A-CODE 5,000");
  assert.equal(formatMoney("abc", "INR"), "");
  assert.equal(formatMoney(undefined), "");
});

test("budget summary: total is computed (never trusted), rows sorted, shares add up sensibly", () => {
  const s = summarizeBudget({ accommodation: 74000, food: 120000, transportation: 35000, activities: 45000, miscellaneous: 11000 }, 285000);
  assert.equal(s.total, 285000);
  assert.deepEqual(s.rows.map((r) => r.key), ["food", "accommodation", "activities", "transportation", "miscellaneous"]);
  assert.equal(s.rows[0].percent, 42);
  assert.deepEqual([s.over, s.remaining, s.usedPercent, s.hasBudget], [false, 0, 100, true]);
});

test("budget summary flags an over-budget plan and handles a missing budget", () => {
  const over = summarizeBudget({ food: 150000, accommodation: 200000 }, 285000);
  assert.deepEqual([over.over, over.remaining, over.usedPercent], [true, -65000, 123]);
  const under = summarizeBudget({ food: 100000 }, 285000);
  assert.deepEqual([under.over, under.remaining, under.usedPercent], [false, 185000, 35]);
  const none = summarizeBudget({ food: 100 }, undefined);
  assert.deepEqual([none.hasBudget, none.over, none.remaining], [false, false, 0]);
  const empty = summarizeBudget({}, 100);
  assert.deepEqual([empty.rows, empty.total, empty.usedPercent], [[], 0, 0]);
  assert.equal(summarizeBudget({ food: 10, bogus: 99, activities: -5 }, 100).total, 10, "unknown/negative rows ignored");
  assert.equal(summarizeBudget(null, 100).total, 0);
});

test("links are URL-encoded searches (names with &, #, spaces and unicode can't break or inject)", () => {
  const nasty = { name: "Café & Bar #1 <b>", location: "x" };
  const links = hotelLinks(nasty, trip);
  for (const url of Object.values(links)) {
    const parsed = new URL(url);
    assert.equal(parsed.protocol, "https:");
    assert.ok(!url.includes("<b>") && !url.includes(" "), url);
  }
  assert.equal(new URL(links.maps).searchParams.get("query"), "Café & Bar #1 <b>, Tokyo, Japan", "decodes back to exactly what we put in");
});

test("hotel links carry the trip's dates and guests", () => {
  const { booking, expedia, hotels } = hotelLinks({ name: "Park Hotel" }, trip);
  const b = new URL(booking).searchParams;
  assert.deepEqual([b.get("ss"), b.get("checkin"), b.get("checkout"), b.get("group_adults")], ["Park Hotel, Tokyo, Japan", "2027-03-24", "2027-03-28", "2"]);
  const e = new URL(expedia);
  assert.equal(e.hostname, "www.expedia.com");
  assert.deepEqual([e.searchParams.get("startDate"), e.searchParams.get("endDate"), e.searchParams.get("adults")], ["2027-03-24", "2027-03-28", "2"]);
  assert.equal(new URL(hotels).hostname, "www.hotels.com");
});

test("hotel links degrade gracefully with no dates / no destination / no travelers", () => {
  const { booking } = hotelLinks({ name: "X" }, {});
  const p = new URL(booking).searchParams;
  assert.equal(p.get("ss"), "X");
  assert.equal(p.get("checkin"), null);
  assert.equal(p.get("group_adults"), "1");
  assert.equal(new URL(hotelLinks({}, {}).maps).searchParams.get("query"), "");
});

test("activity links use venue + city; directions/explore are well-formed", () => {
  const l = activityLinks({ title: "Tokyo Metropolitan Government Building", location: "Shinjuku" }, trip);
  assert.equal(new URL(l.maps).searchParams.get("query"), "Shinjuku, Tokyo, Japan");
  assert.equal(new URL(l.directions).searchParams.get("destination"), "Shinjuku, Tokyo, Japan");
  assert.equal(new URL(l.explore).searchParams.get("q"), "Tokyo Metropolitan Government Building Tokyo, Japan");
  assert.equal(new URL(activityLinks({ title: "Hike" }, {}).maps).searchParams.get("query"), "Hike", "falls back to the title");
  assert.equal(new URL(mapsDirectionsUrl("A", "B")).searchParams.get("origin"), "B");
  assert.equal(new URL(mapsDirectionsUrl("A")).searchParams.get("origin"), null);
  assert.equal(new URL(mapsSearchUrl("a&b=c")).searchParams.get("query"), "a&b=c");
  assert.equal(new URL(exploreUrl("x y")).searchParams.get("q"), "x y");
});

const richStored = {
  summary: "Five days in Tokyo.",
  accommodations: [{ name: "Hotel A", pricePerNight: 18500 }],
  days: [{ day: 1, title: "Arrival", activities: [{ title: "Check in", time: "15:00" }] }, { day: 2, date: "2027-03-25", title: "Temples", activities: [{ title: "Senso-ji" }] }],
  budgetBreakdown: { food: 100000, accommodation: 74000 },
  safetyTips: ["Carry your passport"],
};

test("view model: dates are filled in from the start date, sections appear only when data exists", () => {
  const v = buildItineraryView(richStored, trip);
  assert.deepEqual(v.days.map((d) => [d.date, d.dateLabel]), [["2027-03-24", "Wed, Mar 24"], ["2027-03-25", "Thu, Mar 25"]]);
  assert.equal(v.isRich, true);
  assert.equal(v.accommodations.length, 1);
  assert.equal(v.budget.total, 174000);
  assert.deepEqual([v.localCuisine, v.packingSuggestions, v.transportationTips, v.bestSeason], [[], [], "", ""]);
  assert.deepEqual(v.safetyTips, ["Carry your passport"]);
});

test("view model: an older itinerary (days only) is flagged as not rich and still renders", () => {
  const v = buildItineraryView({ summary: "s", days: [{ day: 1, title: "t", activities: [{ title: "a" }] }] }, trip);
  assert.equal(v.isRich, false);
  assert.equal(v.budget, null);
  assert.equal(v.days.length, 1);
});

test("view model: garbage in storage never crashes the page", () => {
  for (const bad of [undefined, null, "", 42, "text", [], {}, { days: "x" }, { summary: "s", days: [] }, { days: [{ day: 1, activities: [] }] }]) {
    assert.equal(buildItineraryView(bad, trip), null, JSON.stringify(bad));
  }
  assert.equal(buildItineraryView(richStored, undefined).days[0].date, "", "no trip → no derived date, still no crash");
});
