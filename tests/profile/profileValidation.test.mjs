import test from "node:test";
import assert from "node:assert/strict";

import {
  DISPLAY_NAME_MAX,
  DISPLAY_NAME_MIN,
  getDisplayNameError,
  normalizeDisplayName,
  sanitizePreferences,
} from "../../lib/profileValidation.js";
import { TRAVEL_INTERESTS } from "../../lib/travelInterests.js";

test("normalizeDisplayName trims and collapses whitespace", () => {
  assert.equal(normalizeDisplayName("  Ramu    Kadam "), "Ramu Kadam");
  assert.equal(normalizeDisplayName(null), "");
  assert.equal(normalizeDisplayName(undefined), "");
});

test("getDisplayNameError accepts names within the length limits", () => {
  assert.equal(getDisplayNameError("Al"), null);
  assert.equal(getDisplayNameError("  Ramu   Kadam  "), null);
  assert.equal(getDisplayNameError("x".repeat(DISPLAY_NAME_MAX)), null);
});

test("getDisplayNameError rejects empty, too short and too long names", () => {
  assert.match(getDisplayNameError(""), /between/);
  assert.match(getDisplayNameError("   "), /between/);
  assert.match(getDisplayNameError("a"), /between/);
  assert.match(getDisplayNameError("x".repeat(DISPLAY_NAME_MAX + 1)), /between/);
  assert.match(getDisplayNameError(undefined), /between/);
  assert.ok(DISPLAY_NAME_MIN < DISPLAY_NAME_MAX);
});

test("sanitizePreferences keeps only known interests, once each, in order", () => {
  const result = sanitizePreferences([
    "Beaches",
    "Beaches",
    "Not a real interest",
    "Food & Dining",
    5,
    null,
  ]);
  assert.deepEqual(result, ["Beaches", "Food & Dining"]);
});

test("sanitizePreferences returns an empty list for non-arrays", () => {
  assert.deepEqual(sanitizePreferences("Beaches"), []);
  assert.deepEqual(sanitizePreferences(undefined), []);
  assert.deepEqual(sanitizePreferences({}), []);
});

test("travel interests are unique, non-empty strings", () => {
  assert.equal(new Set(TRAVEL_INTERESTS).size, TRAVEL_INTERESTS.length);
  assert.ok(TRAVEL_INTERESTS.every((item) => typeof item === "string" && item.trim()));
});