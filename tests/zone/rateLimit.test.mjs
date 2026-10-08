import test from "node:test";
import assert from "node:assert/strict";

import { consumeRateLimit } from "../../lib/zone/rateLimit.js";
import { fakeFirestore } from "./fakeFirestore.mjs";

const rules = { post: { limit: 3, windowMs: 60_000 }, comment: { limit: 2, windowMs: 10_000 } };
const T0 = Date.UTC(2026, 9, 7, 12, 0, 0);
const at = (ms) => new Date(T0 + ms);
const hit = (db, over = {}) => consumeRateLimit({ db, uid: "ana", action: "post", now: at(0), rules, ...over });

test("allows up to the limit, then blocks with an accurate retry time", async () => {
  const db = fakeFirestore();
  assert.deepEqual(await hit(db), { remaining: 2 });
  assert.deepEqual(await hit(db, { now: at(1000) }), { remaining: 1 });
  assert.deepEqual(await hit(db, { now: at(2000) }), { remaining: 0 });

  await assert.rejects(hit(db, { now: at(20_000) }), (e) => {
    assert.equal(e.status, 429);
    assert.equal(e.code, "rate_limited");
    assert.equal(e.retryAfter, 40, "window started at t=0, so 60s - 20s remain");
    assert.match(e.message, /40 seconds/);
    return true;
  });
});

test("a blocked request doesn't extend the window", async () => {
  const db = fakeFirestore();
  for (let i = 0; i < 3; i++) await hit(db);
  await assert.rejects(hit(db, { now: at(30_000) }));
  await assert.rejects(hit(db, { now: at(59_000) }));
  assert.deepEqual(await hit(db, { now: at(60_000) }), { remaining: 2 }, "fresh window right on schedule");
});

test("short waits are in seconds, long waits in minutes", async () => {
  const long = { post: { limit: 1, windowMs: 3_600_000 } };
  const db = fakeFirestore();
  await hit(db, { rules: long });
  await assert.rejects(hit(db, { rules: long, now: at(1000) }), (e) => e.retryAfter === 3599 && /60 minutes/.test(e.message));
  const db2 = fakeFirestore();
  await hit(db2, { rules: long });
  await assert.rejects(hit(db2, { rules: long, now: at(3_550_000) }), /50 seconds/);
});

test("actions and users are limited independently", async () => {
  const db = fakeFirestore();
  for (let i = 0; i < 3; i++) await hit(db);
  await assert.rejects(hit(db));
  assert.ok(await hit(db, { action: "comment" }), "different action");
  assert.ok(await hit(db, { uid: "raj" }), "different user");
});

test("parallel requests can't slip past the limit", async () => {
  const db = fakeFirestore();
  const results = await Promise.allSettled(Array.from({ length: 12 }, () => hit(db)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
  assert.equal(results.filter((r) => r.status === "rejected" && r.reason.status === 429).length, 9);
});

test("unknown actions fail loudly instead of silently allowing everything", async () => {
  await assert.rejects(hit(fakeFirestore(), { action: "nope" }), /Unknown rate-limit action/);
});

import { indexRequired, isMissingIndexError, rateLimited } from "../../lib/zone/errors.js";

test("missing-index detection: gRPC code 9 or the FAILED_PRECONDITION index message, nothing else", () => {
  assert.equal(isMissingIndexError({ code: 9, message: "x" }), true);
  assert.equal(isMissingIndexError(new Error("9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/...")), true);
  assert.equal(isMissingIndexError(new Error("FAILED_PRECONDITION: document already exists")), false, "other precondition failures are real errors");
  assert.equal(isMissingIndexError({ code: 5, message: "NOT_FOUND" }), false);
  assert.equal(isMissingIndexError(null), false);
  assert.equal(indexRequired().status, 503);
  assert.equal(rateLimited(5).retryAfter, 5);
});
