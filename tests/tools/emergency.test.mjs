import test from "node:test";
import assert from "node:assert/strict";

import { EMERGENCY_COUNTRIES, REGIONS } from "../../lib/tools/emergencyData.js";
import {
  ALL_REGIONS,
  availableRegions,
  filterCountries,
  fold,
  telHref,
} from "../../lib/tools/emergency.js";

const KINDS = ["universal", "police", "fire", "ambulance", "tourist", "helpline"];

test("data: codes and names are unique, regions are known", () => {
  const codes = EMERGENCY_COUNTRIES.map((c) => c.code);
  const names = EMERGENCY_COUNTRIES.map((c) => c.name);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(new Set(names).size, names.length);

  for (const country of EMERGENCY_COUNTRIES) {
    assert.match(country.code, /^[A-Z]{2}$/, country.name);
    assert.ok(REGIONS.includes(country.region), `${country.name}: ${country.region}`);
    assert.ok(Array.isArray(country.aliases), country.name);
  }
});

test("data: every country has valid numbers and a way to reach help", () => {
  for (const country of EMERGENCY_COUNTRIES) {
    assert.ok(country.numbers.length > 0, country.name);

    for (const item of country.numbers) {
      assert.ok(KINDS.includes(item.kind), `${country.name}: kind ${item.kind}`);
      assert.ok(item.label.trim(), country.name);
      assert.match(item.number, /^\+?\d[\d -]*$/, `${country.name}: ${item.number}`);
    }

    const kinds = new Set(country.numbers.map((item) => item.kind));
    const coversEverything =
      kinds.has("universal") ||
      (kinds.has("police") && kinds.has("fire") && kinds.has("ambulance"));
    // Countries such as Japan list one number per service; others one number for all.
    assert.ok(
      coversEverything || (kinds.has("police") && kinds.has("ambulance")),
      `${country.name} should list police and medical help`
    );
  }
});

test("fold lowercases and strips accents", () => {
  assert.equal(fold("  Türkiye "), "turkiye");
  assert.equal(fold(null), "");
});

test("filterCountries: no query returns the region A to Z", () => {
  const all = filterCountries(EMERGENCY_COUNTRIES);
  assert.equal(all.length, EMERGENCY_COUNTRIES.length);
  const names = all.map((c) => c.name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));

  const oceania = filterCountries(EMERGENCY_COUNTRIES, { region: "Oceania" });
  assert.deepEqual(oceania.map((c) => c.code).sort(), ["AU", "NZ"]);
});

test("filterCountries: matches names, codes and aliases", () => {
  assert.equal(filterCountries(EMERGENCY_COUNTRIES, { query: "japan" })[0].code, "JP");
  assert.equal(filterCountries(EMERGENCY_COUNTRIES, { query: "uk" })[0].code, "GB");
  assert.equal(filterCountries(EMERGENCY_COUNTRIES, { query: "USA" })[0].code, "US");
  assert.equal(filterCountries(EMERGENCY_COUNTRIES, { query: "in" })[0].code, "IN");
  assert.equal(filterCountries(EMERGENCY_COUNTRIES, { query: "Turkiye" })[0].code, "TR");
  assert.equal(filterCountries(EMERGENCY_COUNTRIES, { query: "dubai" })[0].code, "AE");
});

test("filterCountries: exact and prefix matches rank above substring matches", () => {
  const results = filterCountries(EMERGENCY_COUNTRIES, { query: "korea" });
  assert.equal(results[0].code, "KR");

  const prefix = filterCountries(EMERGENCY_COUNTRIES, { query: "sw" }).map((c) => c.code);
  assert.deepEqual(prefix.slice(0, 2).sort(), ["CH", "SE"]);
});

test("filterCountries: searching a number finds countries that use it", () => {
  const results = filterCountries(EMERGENCY_COUNTRIES, { query: "112" }).map((c) => c.code);
  assert.ok(results.includes("DE"));
  assert.ok(results.includes("IN"));
  assert.ok(!results.includes("US"));
});

test("filterCountries: query and region combine; nonsense gives nothing", () => {
  assert.deepEqual(
    filterCountries(EMERGENCY_COUNTRIES, { query: "korea", region: "Europe" }),
    []
  );
  assert.deepEqual(filterCountries(EMERGENCY_COUNTRIES, { query: "zzzz" }), []);
  assert.equal(
    filterCountries(EMERGENCY_COUNTRIES, { query: "", region: ALL_REGIONS }).length,
    EMERGENCY_COUNTRIES.length
  );
});

test("availableRegions only lists regions with countries", () => {
  assert.deepEqual(availableRegions(EMERGENCY_COUNTRIES), REGIONS);
  assert.deepEqual(availableRegions([EMERGENCY_COUNTRIES[0]]), ["Asia"]);
});

test("telHref keeps digits and a leading plus", () => {
  assert.equal(telHref("+61-2-6261-3305"), "tel:+61262613305");
  assert.equal(telHref("1800-255-0000"), "tel:18002550000");
  assert.equal(telHref("112"), "tel:112");
});
