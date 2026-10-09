import test from "node:test";
import assert from "node:assert/strict";

import {
  isRealDate,
  LIMITS,
  localIsoDate,
  validateBucketTitle,
  validateExpenseInput,
} from "../../lib/tools/expenseValidation.js";

const TODAY = "2026-10-08";
const valid = (over = {}) => ({
  title: "Dinner in Bangkok",
  amount: 1250.5,
  currency: "THB",
  date: "2026-10-07",
  ...over,
});
const check = (input) => validateExpenseInput(input, { today: TODAY });

test("a valid expense is cleaned and returned", () => {
  const { value, errors } = check(valid({ title: "  Dinner   in\tBangkok ", note: " pad thai ", currency: "thb" }));
  assert.deepEqual(errors, {});
  assert.deepEqual(value, {
    title: "Dinner in Bangkok",
    amount: 1250.5,
    currency: "THB",
    date: "2026-10-07",
    note: "pad thai",
    bucketId: null,
    tripId: null,
  });
});

test("date defaults to today; ids and note are optional", () => {
  const { value, errors } = check({ title: "Taxi", amount: "300", currency: "INR" });
  assert.deepEqual(errors, {});
  assert.equal(value.date, TODAY);
  assert.equal(value.amount, 300); // numeric strings are accepted
  assert.equal(value.note, "");
});

test("title rules", () => {
  assert.ok(check(valid({ title: "   " })).errors.title);
  assert.ok(check(valid({ title: undefined })).errors.title);
  assert.ok(check(valid({ title: 42 })).errors.title);
  assert.ok(check(valid({ title: "x".repeat(LIMITS.titleMax + 1) })).errors.title);
  assert.equal(check(valid({ title: "x".repeat(LIMITS.titleMax) })).errors.title, undefined);
});

test("amount rules", () => {
  for (const bad of [0, -5, NaN, Infinity, "abc", "", null, undefined, {}, "-3", LIMITS.amountMax + 1]) {
    assert.ok(check(valid({ amount: bad })).errors.amount, `should reject ${String(bad)}`);
  }
  assert.equal(check(valid({ amount: LIMITS.amountMax })).errors.amount, undefined);
});

test("amount is rounded to the currency's decimals, and tiny amounts are rejected", () => {
  assert.equal(check(valid({ currency: "USD", amount: 10.005 })).value.amount, 10.01);
  assert.equal(check(valid({ currency: "USD", amount: 1.234 })).value.amount, 1.23);
  assert.equal(check(valid({ currency: "JPY", amount: 1500.4 })).value.amount, 1500);
  assert.ok(check(valid({ currency: "USD", amount: 0.001 })).errors.amount);
  assert.ok(check(valid({ currency: "JPY", amount: 0.2 })).errors.amount);
});

test("currency must be one we support", () => {
  assert.ok(check(valid({ currency: "XYZ" })).errors.currency);
  assert.ok(check(valid({ currency: "" })).errors.currency);
  assert.ok(check(valid({ currency: 5 })).errors.currency);
  assert.equal(check(valid({ currency: "inr" })).errors.currency, undefined);
});

test("date rules", () => {
  assert.equal(isRealDate("2026-02-28"), true);
  assert.equal(isRealDate("2026-02-30"), false);
  assert.equal(isRealDate("2026-13-01"), false);
  assert.equal(isRealDate("26-1-1"), false);
  assert.equal(isRealDate(20261008), false);

  assert.ok(check(valid({ date: "2026-02-30" })).errors.date);
  assert.ok(check(valid({ date: "1999-12-31" })).errors.date);
  assert.ok(check(valid({ date: "2026-10-11" })).errors.date); // 3 days ahead
  assert.equal(check(valid({ date: "2026-10-10" })).errors.date, undefined); // 2 days ahead is ok
});

test("note, bucket and trip ids", () => {
  assert.ok(check(valid({ note: "x".repeat(LIMITS.noteMax + 1) })).errors.note);
  assert.ok(check(valid({ note: 5 })).errors.note);
  assert.ok(check(valid({ bucketId: "a/b" })).errors.bucketId);
  assert.ok(check(valid({ tripId: "../x" })).errors.tripId);
  assert.ok(check(valid({ tripId: {} })).errors.tripId);
  assert.equal(check(valid({ bucketId: "", tripId: null })).value.bucketId, null);
  assert.equal(check(valid({ bucketId: "abc_123-X" })).value.bucketId, "abc_123-X");
});

test("unknown fields are dropped and a non-object input is just invalid", () => {
  const { value } = check(valid({ userId: "evil", createdAt: "x", __proto__: { admin: true } }));
  assert.deepEqual(Object.keys(value).sort(), ["amount", "bucketId", "currency", "date", "note", "title", "tripId"]);
  assert.ok(Object.keys(check(null).errors).length > 0);
  assert.ok(Object.keys(check("hello").errors).length > 0);
});

test("all problems are reported together", () => {
  const { errors } = check({ title: "", amount: -1, currency: "XYZ", date: "nope" });
  assert.deepEqual(Object.keys(errors).sort(), ["amount", "currency", "date", "title"]);
});

test("bucket titles", () => {
  assert.deepEqual(validateBucketTitle("  Food   & Drinks "), { value: "Food & Drinks", error: null });
  assert.ok(validateBucketTitle("   ").error);
  assert.ok(validateBucketTitle(undefined).error);
  assert.ok(validateBucketTitle("x".repeat(LIMITS.bucketMax + 1)).error);
  assert.equal(validateBucketTitle("x".repeat(LIMITS.bucketMax)).error, null);
});

test("localIsoDate uses the local calendar day, zero padded", () => {
  assert.equal(localIsoDate(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(localIsoDate(new Date(2026, 11, 31, 0, 1)), "2026-12-31");
});
