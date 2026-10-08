import test from "node:test";
import assert from "node:assert/strict";

import { createAccount, isUsernameAvailable, prepareSignup, signUp } from "../../lib/auth/service.js";
import { INTEREST_OPTIONS } from "../../lib/auth/validation.js";
import { fakeFirestore } from "../zone/fakeFirestore.mjs";

// Minimal stand-in for the Admin Auth API: unique emails, deletable users.
function fakeAdminAuth({ failCreateWith, failDelete } = {}) {
  const users = new Map();
  let n = 0;
  return {
    users,
    deleted: [],
    async createUser({ email, password, displayName }) {
      if (failCreateWith) throw Object.assign(new Error("boom"), { code: failCreateWith });
      if ([...users.values()].some((u) => u.email === email)) throw Object.assign(new Error("exists"), { code: "auth/email-already-exists" });
      const uid = `uid${++n}`;
      users.set(uid, { uid, email, password, displayName });
      return { uid };
    },
    async deleteUser(uid) {
      if (failDelete) throw new Error("delete failed");
      this.deleted.push(uid);
      users.delete(uid);
    },
  };
}

const input = (over = {}) => ({ email: "ana@example.com", password: "hunter2hunter2", name: "Ana Rao", username: "ana_rao", interests: INTEREST_OPTIONS.slice(0, 3), ...over });
const NOW = new Date("2026-10-08T10:00:00Z");

test("happy path: auth user + profile + username claim, all consistent", async () => {
  const db = fakeFirestore();
  const adminAuth = fakeAdminAuth();
  const { uid } = await signUp({ db, adminAuth, input: input({ email: " Ana@Example.com", username: "@Ana_Rao" }), now: NOW });

  assert.equal(adminAuth.users.get(uid).email, "ana@example.com");
  assert.equal(adminAuth.users.get(uid).displayName, "Ana Rao", "displayName set so the blog shows the author's name");
  assert.deepEqual(db.store.get(`usernames/ana_rao`), { uid, createdAt: NOW });
  assert.deepEqual(db.store.get(`users/${uid}`), {
    uid, name: "Ana Rao", username: "ana_rao", email: "ana@example.com", photoURL: "",
    preferences: INTEREST_OPTIONS.slice(0, 3), createdAt: NOW, updatedAt: NOW,
  });
  assert.ok(!JSON.stringify([...db.store.values()]).includes("hunter2"), "the password is never written to Firestore");
});

test("invalid input: 400 with per-field messages and NO side effects", async () => {
  const db = fakeFirestore();
  const adminAuth = fakeAdminAuth();
  await assert.rejects(signUp({ db, adminAuth, input: input({ name: "", interests: [] }) }), (e) => {
    assert.equal(e.status, 400);
    assert.deepEqual(Object.keys(e.fields).sort(), ["interests", "name"]);
    return true;
  });
  assert.equal(adminAuth.users.size + db.store.size, 0);
  assert.throws(() => prepareSignup(null), { status: 400 });
});

test("taken username (early check): 409 on the username field, no auth user created", async () => {
  const db = fakeFirestore();
  const adminAuth = fakeAdminAuth();
  await signUp({ db, adminAuth, input: input(), now: NOW });
  await assert.rejects(signUp({ db, adminAuth, input: input({ email: "other@example.com" }) }), (e) => {
    assert.equal(e.status, 409);
    assert.match(e.fields.username, /already taken/);
    return true;
  });
  assert.equal(adminAuth.users.size, 1, "second attempt created nothing");
});

test("two people claiming one username at the same instant: exactly one wins, loser is rolled back", async () => {
  const db = fakeFirestore();
  const adminAuth = fakeAdminAuth();
  const results = await Promise.allSettled([
    signUp({ db, adminAuth, input: input({ email: "a@example.com" }), now: NOW }),
    signUp({ db, adminAuth, input: input({ email: "b@example.com" }), now: NOW }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const loser = results.find((r) => r.status === "rejected");
  assert.equal(loser.reason.status, 409);
  assert.equal(adminAuth.users.size, 1, "the loser's auth user was deleted");
  assert.equal(adminAuth.deleted.length, 1);
  assert.equal([...db.store.keys()].filter((k) => k.startsWith("users/")).length, 1, "only one profile");
});

// Makes the *early* "is the username free?" read lie (it says free) while the transaction
// sees the truth. That's exactly what a lost race looks like, and it forces the
// create-then-roll-back branch that a pre-claimed username would skip.
function blindEarlyCheck(db) {
  return {
    ...db,
    collection: (name) => {
      const col = db.collection(name);
      if (name !== "usernames") return col;
      return { ...col, doc: (id) => ({ ...col.doc(id), get: async () => ({ id, exists: false, data: () => undefined }) }) };
    },
  };
}

test("losing the race inside the transaction rolls the auth user back; the same email can retry", async () => {
  const db = fakeFirestore();
  const adminAuth = fakeAdminAuth();
  db.store.set("usernames/fresh_name", { uid: "someone-else" });
  const values = prepareSignup(input({ email: "retry@example.com", username: "fresh_name" }));

  await assert.rejects(createAccount({ db: blindEarlyCheck(db), adminAuth, values }), (e) => e.status === 409 && Boolean(e.fields.username));
  assert.equal(adminAuth.users.size, 0, "auth user was created, then deleted");
  assert.equal(adminAuth.deleted.length, 1);
  assert.ok(![...db.store.keys()].some((k) => k.startsWith("users/")), "no profile written");
  assert.deepEqual(db.store.get("usernames/fresh_name"), { uid: "someone-else" }, "the winner's claim is untouched");

  await createAccount({ db, adminAuth, values: { ...values, username: "fresh_name_2" }, now: NOW });
  assert.equal([...adminAuth.users.values()][0].email, "retry@example.com", "same email works on retry");
});

test("if the rollback itself fails, the person still gets the real error (and it's logged)", async () => {
  const db = fakeFirestore();
  const adminAuth = fakeAdminAuth({ failDelete: true });
  db.store.set("usernames/ana_rao", { uid: "someone-else" });
  const logged = [];
  const original = console.error;
  console.error = (...args) => logged.push(args);
  try {
    await assert.rejects(createAccount({ db: blindEarlyCheck(db), adminAuth, values: prepareSignup(input()) }), { status: 409 });
  } finally {
    console.error = original;
  }
  assert.equal(logged.length, 1, "orphan is logged so it can be cleaned up");
});

test("existing email: 409 on the email field", async () => {
  const db = fakeFirestore();
  const adminAuth = fakeAdminAuth();
  await signUp({ db, adminAuth, input: input(), now: NOW });
  await assert.rejects(signUp({ db, adminAuth, input: input({ username: "someone_else" }) }), (e) => {
    assert.equal(e.status, 409);
    assert.match(e.fields.email, /already exists/);
    return true;
  });
  assert.ok(!db.store.has("usernames/someone_else"), "username not claimed by a failed signup");
});

test("firebase's own rejections are mapped to field errors; unknown ones propagate", async () => {
  const db = fakeFirestore();
  await assert.rejects(signUp({ db, adminAuth: fakeAdminAuth({ failCreateWith: "auth/invalid-password" }), input: input() }), (e) => e.status === 400 && Boolean(e.fields.password));
  await assert.rejects(signUp({ db, adminAuth: fakeAdminAuth({ failCreateWith: "auth/invalid-email" }), input: input() }), (e) => e.status === 400 && Boolean(e.fields.email));
  await assert.rejects(signUp({ db, adminAuth: fakeAdminAuth({ failCreateWith: "auth/internal-error" }), input: input() }), (e) => e.code === "auth/internal-error");
});

test("username availability: format errors never touch the database", async () => {
  const db = fakeFirestore();
  db.store.set("usernames/taken_one", { uid: "u" });
  assert.deepEqual(await isUsernameAvailable({ db, username: "fresh_one" }), { available: true });
  assert.deepEqual(await isUsernameAvailable({ db, username: "@Taken_One" }), { available: false, reason: "That username is already taken." });
  assert.equal((await isUsernameAvailable({ db, username: "a" })).available, false);
  assert.match((await isUsernameAvailable({ db, username: "admin" })).reason, /isn't available/);
  assert.equal((await isUsernameAvailable({ db, username: "a/b" })).available, false, "path characters rejected before any lookup");
  assert.equal((await isUsernameAvailable({ db: null, username: "no" })).available, false, "db not even needed for invalid names");
});
