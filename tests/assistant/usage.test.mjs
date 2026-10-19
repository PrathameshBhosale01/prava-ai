import test from "node:test";
import assert from "node:assert/strict";

import { buildSnapshot, creditLimitMessage, formatResetDate, getUsageSnapshot, nextResetKey, refundUsage, reserveUsage } from "../../lib/assistant/usage.js";
import { CREDIT_COSTS, PLANS } from "../../lib/plans.js";

import { fakeDb } from "./helpers.mjs";

const NOW = new Date("2026-10-04T06:30:00Z"); // October, IST
const NEXT_MONTH = new Date("2026-11-02T06:30:00Z");
const FREE = PLANS.free.credits;
const PERIOD = "2026-10";
const PRO_USER = { subscription: { plan: "pro", status: "active" } };

test("fresh users start at zero with the free monthly credits", () => {
  const snapshot = buildSnapshot({}, NOW);
  assert.equal(snapshot.plan, "free");
  assert.equal(snapshot.period, PERIOD);
  assert.deepEqual(snapshot.credits, { used: 0, limit: FREE, remaining: FREE });
  assert.equal(snapshot.resetsOn, "2026-11-01");
});

test("pro subscribers get pro credits (legacy flag included)", () => {
  assert.equal(buildSnapshot(PRO_USER, NOW).credits.limit, PLANS.pro.credits);
  assert.equal(buildSnapshot({ subscription: "pro" }, NOW).credits.limit, PLANS.pro.credits);
});

test("reset date: next month's 1st, including the December rollover", () => {
  assert.equal(nextResetKey(new Date("2026-12-20T10:00:00Z")), "2027-01-01");
  assert.equal(formatResetDate("2026-11-01"), "1 Nov");
});

test("reserve takes the action's cost and keeps other fields", async () => {
  const db = fakeDb({ u1: { name: "A" } });
  const msg = await reserveUsage({ db, uid: "u1", kind: "message", now: NOW });
  assert.equal(msg.allowed, true);
  assert.equal(msg.cost, CREDIT_COSTS.message);
  const plan = await reserveUsage({ db, uid: "u1", kind: "plan", now: NOW });
  assert.equal(plan.snapshot.credits.used, CREDIT_COSTS.message + CREDIT_COSTS.plan);
  assert.equal(db.store.get("u1").name, "A", "other fields must be preserved");
  assert.deepEqual(db.store.get("u1").aiCredits, { period: PERIOD, used: 6 });
});

test("blocks when the credits left are less than the cost, and does not charge", async () => {
  const db = fakeDb({ u1: { aiCredits: { period: PERIOD, used: FREE - 2 } } });
  const plan = await reserveUsage({ db, uid: "u1", kind: "plan", now: NOW });
  assert.equal(plan.allowed, false);
  assert.equal(plan.snapshot.credits.remaining, 2);
  assert.equal(db.store.get("u1").aiCredits.used, FREE - 2, "must not charge when blocked");
  assert.equal((await reserveUsage({ db, uid: "u1", kind: "refine", now: NOW })).allowed, true, "2 credits left covers a refine");
});

test("credits reset in a new month", async () => {
  const db = fakeDb({ u1: { aiCredits: { period: PERIOD, used: FREE } } });
  assert.equal((await reserveUsage({ db, uid: "u1", kind: "message", now: NOW })).allowed, false);
  const next = await reserveUsage({ db, uid: "u1", kind: "message", now: NEXT_MONTH });
  assert.equal(next.allowed, true);
  assert.deepEqual(db.store.get("u1").aiCredits, { period: "2026-11", used: 1 });
});

test("parallel reservations never overspend", async () => {
  const db = fakeDb({ u1: {} });
  const attempts = Math.ceil(FREE / CREDIT_COSTS.plan) + 4;
  const results = await Promise.all(Array.from({ length: attempts }, () => reserveUsage({ db, uid: "u1", kind: "plan", now: NOW })));
  assert.equal(results.filter((r) => r.allowed).length, Math.floor(FREE / CREDIT_COSTS.plan));
  assert.ok(db.store.get("u1").aiCredits.used <= FREE);
});

test("a downgrade shrinks the pool but keeps what was used", async () => {
  const used = 100;
  const db = fakeDb({ u1: { subscription: { plan: "pro", status: "canceled", currentPeriodEnd: NOW.getTime() - 1000 }, aiCredits: { period: PERIOD, used } } });
  const snapshot = await getUsageSnapshot({ db, uid: "u1", now: NOW });
  assert.equal(snapshot.plan, "free");
  assert.deepEqual(snapshot.credits, { used, limit: FREE, remaining: 0 });
});

test("refund gives the action's cost back but never goes below zero", async () => {
  const db = fakeDb({ u1: {} });
  await reserveUsage({ db, uid: "u1", kind: "plan", now: NOW });
  await refundUsage({ db, uid: "u1", kind: "plan", now: NOW });
  assert.equal(db.store.get("u1").aiCredits.used, 0);
  await refundUsage({ db, uid: "u1", kind: "plan", now: NOW });
  assert.equal(db.store.get("u1").aiCredits.used, 0);
});

test("getUsageSnapshot works for users without a document", async () => {
  const snapshot = await getUsageSnapshot({ db: fakeDb(), uid: "ghost", now: NOW });
  assert.equal(snapshot.credits.used, 0);
});

test("rejects unknown kinds", async () => {
  await assert.rejects(reserveUsage({ db: fakeDb(), uid: "u", kind: "bogus" }), /Unknown credit kind/);
});

test("limit messages: all used vs not enough, with an upgrade nudge only for Free", () => {
  const free = buildSnapshot({ aiCredits: { period: PERIOD, used: FREE } }, NOW);
  assert.match(creditLimitMessage(free, 1), /used all 30 AI credits for this month\. They reset on 1 Nov\. Upgrade to Pro for 150/);
  const some = buildSnapshot({ aiCredits: { period: PERIOD, used: FREE - 3 } }, NOW);
  assert.match(creditLimitMessage(some, 5), /needs 5 AI credits and you have 3 left/);
  const pro = buildSnapshot({ ...PRO_USER, aiCredits: { period: PERIOD, used: PLANS.pro.credits } }, NOW);
  assert.doesNotMatch(creditLimitMessage(pro, 1), /Upgrade/);
});
