import test from "node:test";
import assert from "node:assert/strict";

import { formatLongDate, getMemberSinceDate } from "../../lib/profileFormat.js";

const timestamp = (date) => ({ toDate: () => date });

test("getMemberSinceDate prefers the Firestore createdAt", () => {
  const created = new Date(2026, 2, 23, 12);
  const result = getMemberSinceDate(
    { createdAt: timestamp(created) },
    { metadata: { creationTime: "2020-01-01T00:00:00Z" } }
  );
  assert.equal(result.getTime(), created.getTime());
});

test("getMemberSinceDate falls back to the Auth creation time", () => {
  const result = getMemberSinceDate(null, {
    metadata: { creationTime: "Mon, 23 Mar 2026 10:00:00 GMT" },
  });
  assert.equal(result.getUTCFullYear(), 2026);
  assert.equal(result.getUTCMonth(), 2);
});

test("getMemberSinceDate falls back when createdAt is still pending", () => {
  // A just-written serverTimestamp() reads as null until the server confirms it.
  const result = getMemberSinceDate(
    { createdAt: null },
    { metadata: { creationTime: "2026-03-23T10:00:00Z" } }
  );
  assert.ok(result instanceof Date);
});

test("getMemberSinceDate returns null when nothing usable exists", () => {
  assert.equal(getMemberSinceDate(null, null), null);
  assert.equal(getMemberSinceDate({}, {}), null);
  assert.equal(getMemberSinceDate({ createdAt: "not a date" }, { metadata: {} }), null);
});

test("formatLongDate formats a date and tolerates a missing one", () => {
  assert.equal(formatLongDate(new Date(2026, 2, 23, 12), "en-US"), "March 23, 2026");
  assert.equal(formatLongDate(null), "");
});