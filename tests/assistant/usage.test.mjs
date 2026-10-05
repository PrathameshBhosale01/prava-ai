import test from "node:test";
import assert from "node:assert/strict";

import { buildSnapshot, getUsageSnapshot, refundUsage, reserveUsage } from "../../lib/assistant/usage.js";
import { USAGE_LIMITS } from "../../lib/assistant/config.js";

import { fakeDb } from "./helpers.mjs";

const NOW = new Date("2026-10-04T06:30:00Z"); // 2026-10-04 IST
const TOMORROW = new Date("2026-10-05T06:30:00Z");
const FREE = USAGE_LIMITS.free;

test("fresh users start at zero with free-plan limits", () => {
  const snapshot = buildSnapshot({}, NOW);
  assert.equal(snapshot.plan, "free");
  assert.deepEqual(snapshot.plans, { used: 0, limit: FREE.plansPerDay, remaining: FREE.plansPerDay });
});

test("pro subscribers get pro limits", () => {
  assert.equal(buildSnapshot({ subscription: "pro" }, NOW).plans.limit, USAGE_LIMITS.pro.plansPerDay);
});

test("reserve increments the matching counter only", async () => {
  const db = fakeDb({ u1: { name: "A" } });
  const result = await reserveUsage({ db, uid: "u1", kind: "message", now: NOW });
  assert.equal(result.allowed, true);
  assert.equal(result.snapshot.messages.used, 1);
  assert.equal(result.snapshot.plans.used, 0);
  assert.equal(db.store.get("u1").name, "A", "other fields must be preserved");
});

test("blocks once the plan limit is reached", async () => {
  const db = fakeDb({ u1: { aiUsage: { day: "2026-10-04", messages: 0, plans: FREE.plansPerDay } } });
  const result = await reserveUsage({ db, uid: "u1", kind: "plan", now: NOW });
  assert.equal(result.allowed, false);
  assert.equal(result.snapshot.plans.remaining, 0);
  assert.equal(db.store.get("u1").aiUsage.plans, FREE.plansPerDay, "must not increment when blocked");
});

test("counters reset on a new day", async () => {
  const db = fakeDb({ u1: { aiUsage: { day: "2026-10-04", messages: FREE.messagesPerDay, plans: 3 } } });
  assert.equal((await reserveUsage({ db, uid: "u1", kind: "message", now: NOW })).allowed, false);
  const next = await reserveUsage({ db, uid: "u1", kind: "message", now: TOMORROW });
  assert.equal(next.allowed, true);
  assert.deepEqual(db.store.get("u1").aiUsage, { day: "2026-10-05", messages: 1, plans: 0 });
});

test("parallel reservations never exceed the limit", async () => {
  const db = fakeDb({ u1: {} });
  const results = await Promise.all(
    Array.from({ length: FREE.plansPerDay + 4 }, () => reserveUsage({ db, uid: "u1", kind: "plan", now: NOW })),
  );
  assert.equal(results.filter((r) => r.allowed).length, FREE.plansPerDay);
});

test("refund gives a unit back but never goes below zero", async () => {
  const db = fakeDb({ u1: {} });
  await reserveUsage({ db, uid: "u1", kind: "message", now: NOW });
  await refundUsage({ db, uid: "u1", kind: "message", now: NOW });
  assert.equal(db.store.get("u1").aiUsage.messages, 0);
  await refundUsage({ db, uid: "u1", kind: "message", now: NOW });
  assert.equal(db.store.get("u1").aiUsage.messages, 0);
});

test("getUsageSnapshot works for users without a document", async () => {
  const snapshot = await getUsageSnapshot({ db: fakeDb(), uid: "ghost", now: NOW });
  assert.equal(snapshot.messages.used, 0);
});

test("rejects unknown kinds", async () => {
  await assert.rejects(reserveUsage({ db: fakeDb(), uid: "u", kind: "bogus" }), /Unknown usage kind/);
});