import test from "node:test";
import assert from "node:assert/strict";

import {
  createBucket,
  createExpense,
  deleteBucket,
  deleteExpense,
  listExpenseData,
  updateExpense,
} from "../../lib/tools/expenseService.js";
import { LIMITS } from "../../lib/tools/expenseValidation.js";
import { fakeFirestore } from "../zone/fakeFirestore.mjs";

const TODAY = "2026-10-08";
let tick = 0;
const at = () => new Date(Date.UTC(2026, 9, 8, 0, 0, tick++));
const base = (over = {}) => ({ title: "Dinner", amount: 500, currency: "INR", date: "2026-10-07", ...over });
const add = (db, uid, over) => createExpense({ db, uid, input: base(over), now: at(), today: TODAY });

async function rejects(promise, { status, field, message }) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.status, status);
    if (field) assert.ok(error.fields?.[field], `expected a "${field}" error, got ${JSON.stringify(error.fields)}`);
    if (message) assert.match(error.message, message);
    return true;
  });
}

test("create then list: newest first, stored under the caller", async () => {
  const db = fakeFirestore();
  const first = await add(db, "ana", { title: "Taxi" });
  const second = await add(db, "ana", { title: "Lunch" });

  assert.equal(first.amount, 500);
  assert.equal(first.bucketId, null);

  const { expenses, buckets, truncated } = await listExpenseData({ db, uid: "ana" });
  assert.deepEqual(expenses.map((e) => e.title), ["Lunch", "Taxi"]);
  assert.deepEqual(buckets, []);
  assert.equal(truncated, false);
  assert.equal(expenses[0].id, second.id);
  assert.match(expenses[0].createdAt, /^2026-10-08T/);
});

test("users only ever see their own data", async () => {
  const db = fakeFirestore();
  await add(db, "ana", { title: "Ana's" });
  await createBucket({ db, uid: "ana", input: { title: "Food" }, now: at() });

  const raj = await listExpenseData({ db, uid: "raj" });
  assert.deepEqual(raj.expenses, []);
  assert.deepEqual(raj.buckets, []);
});

test("invalid input is rejected with field errors and nothing is saved", async () => {
  const db = fakeFirestore();
  await rejects(add(db, "ana", { amount: -3, title: "" }), { status: 400, field: "amount" });
  assert.equal((await listExpenseData({ db, uid: "ana" })).expenses.length, 0);
});

test("extra fields from the client are never stored", async () => {
  const db = fakeFirestore();
  const created = await add(db, "ana", { userId: "evil", uid: "evil", createdAt: "1999", isAdmin: true });
  const stored = db.store.get(`users/ana/expenses/${created.id}`);
  assert.equal(stored.userId, undefined);
  assert.equal(stored.isAdmin, undefined);
  assert.ok(stored.createdAt instanceof Date);
});

test("buckets: create, trim, reject duplicates (case-insensitive) and bad names", async () => {
  const db = fakeFirestore();
  const bucket = await createBucket({ db, uid: "ana", input: { title: "  Food  " }, now: at() });
  assert.equal(bucket.title, "Food");

  await rejects(createBucket({ db, uid: "ana", input: { title: "food" } }), { status: 400, field: "title" });
  await rejects(createBucket({ db, uid: "ana", input: { title: "  " } }), { status: 400, field: "title" });
  // another user may reuse the name
  await createBucket({ db, uid: "raj", input: { title: "Food" }, now: at() });
});

test("buckets: capped per user", async () => {
  const db = fakeFirestore();
  for (let i = 0; i < LIMITS.bucketsPerUser; i += 1) {
    await createBucket({ db, uid: "ana", input: { title: `Bucket ${i}` }, now: at() });
  }
  await rejects(createBucket({ db, uid: "ana", input: { title: "One too many" } }), {
    status: 400,
    message: /up to/,
  });
});

test("an expense can only use the caller's own bucket", async () => {
  const db = fakeFirestore();
  const mine = await createBucket({ db, uid: "ana", input: { title: "Food" }, now: at() });
  const theirs = await createBucket({ db, uid: "raj", input: { title: "Food" }, now: at() });

  const ok = await add(db, "ana", { bucketId: mine.id });
  assert.equal(ok.bucketId, mine.id);

  await rejects(add(db, "ana", { bucketId: theirs.id }), { status: 400, field: "bucketId" });
  await rejects(add(db, "ana", { bucketId: "ghost" }), { status: 400, field: "bucketId" });
});

test("trip link: allowed for own trips, refused for someone else's or missing ones", async () => {
  const db = fakeFirestore();
  await db.collection("trips").doc("tripA").set({ userId: "ana", title: "Thailand" });
  await db.collection("trips").doc("tripR").set({ userId: "raj", title: "Goa" });

  const linked = await add(db, "ana", { tripId: "tripA" });
  assert.equal(linked.tripId, "tripA");

  await rejects(add(db, "ana", { tripId: "tripR" }), { status: 400, field: "tripId" });
  await rejects(add(db, "ana", { tripId: "ghost" }), { status: 400, field: "tripId" });
  // Same message either way, so trip ids can't be probed
  const a = await add(db, "ana", { tripId: "tripR" }).catch((e) => e.fields.tripId);
  const b = await add(db, "ana", { tripId: "ghost" }).catch((e) => e.fields.tripId);
  assert.equal(a, b);
});

test("update: changes only what was sent, can link and unlink a trip", async () => {
  const db = fakeFirestore();
  await db.collection("trips").doc("tripA").set({ userId: "ana", title: "Thailand" });
  const created = await add(db, "ana", { title: "Taxi", note: "airport" });

  const renamed = await updateExpense({ db, uid: "ana", expenseId: created.id, input: { title: "Grab" }, now: at(), today: TODAY });
  assert.equal(renamed.title, "Grab");
  assert.equal(renamed.note, "airport");
  assert.equal(renamed.amount, 500);

  const linked = await updateExpense({ db, uid: "ana", expenseId: created.id, input: { tripId: "tripA" }, now: at(), today: TODAY });
  assert.equal(linked.tripId, "tripA");

  const unlinked = await updateExpense({ db, uid: "ana", expenseId: created.id, input: { tripId: null }, now: at(), today: TODAY });
  assert.equal(unlinked.tripId, null);

  const stored = db.store.get(`users/ana/expenses/${created.id}`);
  assert.equal(stored.tripId, null);
  assert.equal(stored.title, "Grab");
});

test("update: validates, ignores unknown fields, and can't touch another user's expense", async () => {
  const db = fakeFirestore();
  const created = await add(db, "ana");

  await rejects(
    updateExpense({ db, uid: "ana", expenseId: created.id, input: { amount: 0 }, today: TODAY }),
    { status: 400, field: "amount" }
  );
  await rejects(
    updateExpense({ db, uid: "raj", expenseId: created.id, input: { title: "Hijack" }, today: TODAY }),
    { status: 404 }
  );
  await rejects(updateExpense({ db, uid: "ana", expenseId: "ghost", input: {}, today: TODAY }), { status: 404 });

  await updateExpense({ db, uid: "ana", expenseId: created.id, input: { userId: "evil", title: "Still mine" }, today: TODAY });
  const stored = db.store.get(`users/ana/expenses/${created.id}`);
  assert.equal(stored.userId, undefined);
  assert.equal(stored.title, "Still mine");
});

test("ids from the URL can't escape their collection", async () => {
  const db = fakeFirestore();
  await rejects(deleteExpense({ db, uid: "ana", expenseId: "x/y" }), { status: 404 });
  await rejects(deleteExpense({ db, uid: "ana", expenseId: "../trips" }), { status: 404 });
  await rejects(deleteBucket({ db, uid: "ana", bucketId: "a/b" }), { status: 404 });
  await rejects(listExpenseData({ db, uid: "a/b" }), { status: 404 });
});

test("delete: removes only the caller's expense", async () => {
  const db = fakeFirestore();
  const created = await add(db, "ana");

  await rejects(deleteExpense({ db, uid: "raj", expenseId: created.id }), { status: 404 });
  assert.equal((await listExpenseData({ db, uid: "ana" })).expenses.length, 1);

  assert.deepEqual(await deleteExpense({ db, uid: "ana", expenseId: created.id }), { ok: true });
  assert.equal((await listExpenseData({ db, uid: "ana" })).expenses.length, 0);
  await rejects(deleteExpense({ db, uid: "ana", expenseId: created.id }), { status: 404 });
});

test("deleting a bucket keeps its expenses and moves them to General", async () => {
  const db = fakeFirestore();
  const food = await createBucket({ db, uid: "ana", input: { title: "Food" }, now: at() });
  const stay = await createBucket({ db, uid: "ana", input: { title: "Stay" }, now: at() });
  await add(db, "ana", { title: "Lunch", bucketId: food.id });
  await add(db, "ana", { title: "Dinner", bucketId: food.id });
  await add(db, "ana", { title: "Hotel", bucketId: stay.id });

  assert.deepEqual(await deleteBucket({ db, uid: "ana", bucketId: food.id }), { moved: 2 });

  const { buckets, expenses } = await listExpenseData({ db, uid: "ana" });
  assert.deepEqual(buckets.map((b) => b.title), ["Stay"]);
  assert.equal(expenses.length, 3);
  assert.deepEqual(expenses.filter((e) => e.bucketId === null).map((e) => e.title).sort(), ["Dinner", "Lunch"]);
  assert.equal(expenses.find((e) => e.title === "Hotel").bucketId, stay.id);

  await rejects(deleteBucket({ db, uid: "ana", bucketId: food.id }), { status: 404 });
  await rejects(deleteBucket({ db, uid: "raj", bucketId: stay.id }), { status: 404 });
});
