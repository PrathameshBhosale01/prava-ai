import test from "node:test";
import assert from "node:assert/strict";

import { normalizePlaceResults, searchPlaces } from "../../lib/placeSearch.js";

const goa = { id: 1, name: "Goa", admin1: "Goa", country: "India", country_code: "in", latitude: 15.3, longitude: 74.1 };
const paris = { id: 2, name: "Paris", admin1: "Île-de-France", country: "France", country_code: "FR", latitude: 48.85, longitude: 2.35 };
const parisTx = { id: 3, name: "Paris", admin1: "Texas", country: "United States", country_code: "US", latitude: 33.66, longitude: -95.55 };

test("results become short, safe suggestions in the app's 'City, Country' style", () => {
  const [a, b] = normalizePlaceResults({ results: [goa, paris] });
  assert.deepEqual(a, { id: "1", name: "Goa", place: "Goa, India", detail: "India", country: "India", countryCode: "IN", lat: 15.3, lon: 74.1 });
  assert.equal(b.place, "Paris, France");
  assert.equal(b.detail, "Île-de-France, France", "the grey line tells places apart");
});

test("two Parises stay separate, true duplicates and unusable rows are dropped", () => {
  const out = normalizePlaceResults({ results: [paris, parisTx, { ...paris, id: 99 }, { name: "", latitude: 1, longitude: 1 }, { name: "NoCoords" }, { name: "Bad", latitude: "1", longitude: 2 }, null] });
  assert.deepEqual(out.map((p) => p.detail), ["Île-de-France, France", "Texas, United States"]);
});

test("no country → just the name; odd country codes are ignored; list is capped", () => {
  const [p] = normalizePlaceResults({ results: [{ name: "Atlantis", latitude: 0, longitude: 0, country_code: "ATL" }] });
  assert.deepEqual([p.place, p.countryCode, p.detail], ["Atlantis", "", ""]);
  const many = Array.from({ length: 20 }, (_, i) => ({ name: `P${i}`, latitude: i, longitude: i }));
  assert.equal(normalizePlaceResults({ results: many }).length, 6);
});

test("garbage from the geocoder never throws", () => {
  for (const bad of [undefined, null, {}, [], "x", { results: "x" }, { results: null }]) assert.deepEqual(normalizePlaceResults(bad), []);
});

test("searchPlaces: sends the query safely, skips short ones, surfaces failures", async () => {
  const calls = [];
  const ok = async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => ({ results: [goa] }) };
  };
  const found = await searchPlaces("  goa  &x=1 ", { fetchImpl: ok });
  assert.equal(found[0].place, "Goa, India");
  assert.equal(new URL(calls[0]).searchParams.get("name"), "goa &x=1", "decodes back to exactly what was typed (no injection)");

  assert.deepEqual(await searchPlaces("g", { fetchImpl: ok }), []);
  assert.equal(calls.length, 1, "no request for a 1-character query");

  await assert.rejects(searchPlaces("goa", { fetchImpl: async () => ({ ok: false, status: 503 }) }), /503/);
});
