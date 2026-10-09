import test from "node:test";
import assert from "node:assert/strict";

import { completeProfile } from "../../lib/auth/profileService.js";
import { gateState, needsProfile } from "../../lib/auth/profileState.js";
import { validateProfile } from "../../lib/auth/profileValidation.js";
import { INTEREST_OPTIONS } from "../../lib/auth/validation.js";
import { fakeFirestore } from "../zone/fakeFirestore.mjs";

const NOW = new Date("2026-10-09T10:00:00Z");
const EARLIER = new Date("2026-09-01T10:00:00Z");
const interests = INTEREST_OPTIONS.slice(0, 3);

function fakeAdminAuth({ failUpdate } = {}) {
  const records = new Map([["g1", { uid: "g1", email: "g@example.com", photoURL: "https://x/g.png", displayName: "Gina G" }]]);
  return {
    updated: [],
    async getUser(uid) {
      if (!records.has(uid)) throw Object.assign(new Error("no user"), { code: "auth/user-not-found" });
      return records.get(uid);
    },
    async updateUser(uid, patch) {
      if (failUpdate) throw new Error("update failed");
      this.updated.push([uid, patch]);
    },
  };
}

// A Google sign-up as the client creates it: no username, no preferences.
const seedGoogleUser = (db, uid = "g1", over = {}) =>
  db.store.set(`users/${uid}`, { uid, name: "Gina G", email: "g@example.com", photoURL: "https://x/g.png", createdAt: EARLIER, updatedAt: EARLIER, ...over });

const input = (over = {}) => ({ name: "Gina G", username: "gina_g", interests, ...over });
const run = (db, adminAuth, over = {}, uid = "g1") => completeProfile({ db, adminAuth, uid, input: input(over), now: NOW });

test("pure rules: who needs the profile step", () => {
  for (const p of [null, undefined, {}, { username: "" }, { username: "   " }, { username: 5 }]) assert.equal(needsProfile(p), true, JSON.stringify(p));
  assert.equal(needsProfile({ username: "ana" }), false);
});

test("gate: waits while it can't tell, fails OPEN on errors, onboards only incomplete profiles", () => {
  const base = { authLoading: false, hasUser: true, profileStatus: "ready", profile: { username: "" }, skipped: false };
  assert.equal(gateState(base), "onboard");
  assert.equal(gateState({ ...base, profile: { username: "ana" } }), "pass");
  assert.equal(gateState({ ...base, skipped: true }), "pass", "skipped for this session");
  assert.equal(gateState({ ...base, profileStatus: "loading" }), "wait");
  assert.equal(gateState({ ...base, profileStatus: "missing" }), "wait", "profile doc is being created");
  assert.equal(gateState({ ...base, profileStatus: "error" }), "pass", "never lock people out because we couldn't read a doc");
  assert.equal(gateState({ ...base, authLoading: true }), "pass", "the shell handles auth loading");
  assert.equal(gateState({ ...base, hasUser: false }), "pass", "the shell handles signed-out visitors");
});

test("profile validation reuses the sign-up rules and reports every problem", () => {
  const ok = validateProfile({ name: "  Gina   G ", username: "@Gina_G", interests });
  assert.deepEqual(ok.fields, {});
  assert.deepEqual([ok.values.name, ok.values.username], ["Gina G", "gina_g"]);
  assert.deepEqual(Object.keys(validateProfile({}).fields).sort(), ["interests", "name", "username"]);
  assert.deepEqual(Object.keys(validateProfile(null).fields).sort(), ["interests", "name", "username"]);
});

test("a Google user completes their profile: username claimed, fields filled, createdAt untouched", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db);
  const adminAuth = fakeAdminAuth();
  assert.deepEqual(await run(db, adminAuth, { username: "@Gina_G" }), { username: "gina_g" });

  assert.deepEqual(db.store.get("usernames/gina_g"), { uid: "g1", createdAt: NOW });
  const user = db.store.get("users/g1");
  assert.equal(user.username, "gina_g");
  assert.deepEqual(user.preferences, interests);
  assert.deepEqual(user.updatedAt, NOW);
  assert.deepEqual(user.createdAt, EARLIER, "original signup time preserved");
  assert.equal(user.email, "g@example.com", "existing fields kept");
  assert.deepEqual(adminAuth.updated, [], "name unchanged → no auth update");
});

test("changing the name also updates the sign-in account's display name", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db);
  const adminAuth = fakeAdminAuth();
  await run(db, adminAuth, { name: "  Gina   Gupta " });
  assert.equal(db.store.get("users/g1").name, "Gina Gupta");
  assert.deepEqual(adminAuth.updated, [["g1", { displayName: "Gina Gupta" }]]);
});

test("if syncing the display name fails the profile is still saved", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db);
  const logged = [];
  const original = console.error;
  console.error = (...a) => logged.push(a);
  try {
    await run(db, fakeAdminAuth({ failUpdate: true }), { name: "Different Name" });
  } finally {
    console.error = original;
  }
  assert.equal(db.store.get("users/g1").username, "gina_g");
  assert.equal(logged.length, 1);
});

test("a missing profile doc is bootstrapped from the account record", async () => {
  const db = fakeFirestore();
  await run(db, fakeAdminAuth());
  assert.deepEqual(db.store.get("users/g1"), {
    uid: "g1", email: "g@example.com", photoURL: "https://x/g.png", createdAt: NOW,
    name: "Gina G", username: "gina_g", preferences: interests, updatedAt: NOW,
  });
});

test("taken username: 409 on the username field and NOTHING is written", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db);
  db.store.set("usernames/gina_g", { uid: "someone-else", createdAt: EARLIER });
  const before = structuredClone([...db.store.entries()]);
  await assert.rejects(run(db, fakeAdminAuth()), (e) => e.status === 409 && /already taken/.test(e.fields.username));
  assert.deepEqual([...db.store.entries()], before);
});

test("invalid input: 400 with field messages, nothing written", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db);
  await assert.rejects(run(db, fakeAdminAuth(), { name: "", interests: ["Beaches"], username: "ab" }), (e) => e.status === 400 && Object.keys(e.fields).length === 3);
  assert.equal(db.store.get("users/g1").username, undefined);
  assert.ok(!db.store.has("usernames/ab"));
});

test("submitting twice with the same username is fine (idempotent), and updates the interests", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db);
  const adminAuth = fakeAdminAuth();
  await run(db, adminAuth);
  await run(db, adminAuth, { interests: INTEREST_OPTIONS.slice(3, 7) });
  assert.deepEqual(db.store.get("users/g1").preferences, INTEREST_OPTIONS.slice(3, 7));
  assert.equal([...db.store.keys()].filter((k) => k.startsWith("usernames/")).length, 1);
});

test("a username can't be swapped once set; the old claim stays", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db);
  const adminAuth = fakeAdminAuth();
  await run(db, adminAuth);
  await assert.rejects(run(db, adminAuth, { username: "brand_new" }), (e) => e.status === 409 && /already set/.test(e.fields.username));
  assert.equal(db.store.get("users/g1").username, "gina_g");
  assert.ok(!db.store.has("usernames/brand_new"), "no stray claim");
});

test("recovers from an earlier half-finished attempt (claim exists for the SAME user)", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db);
  db.store.set("usernames/gina_g", { uid: "g1", createdAt: EARLIER });
  await run(db, fakeAdminAuth());
  assert.equal(db.store.get("users/g1").username, "gina_g");
  assert.deepEqual(db.store.get("usernames/gina_g").createdAt, EARLIER, "existing claim isn't rewritten");
});

test("two different people claiming one username at once: exactly one wins, the loser's profile is untouched", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db, "g1");
  seedGoogleUser(db, "g2", { name: "Hari H", email: "h@example.com" });
  const adminAuth = fakeAdminAuth();
  adminAuth.getUser = async (uid) => ({ uid });
  const results = await Promise.allSettled([run(db, adminAuth, {}, "g1"), run(db, adminAuth, { name: "Hari H" }, "g2")]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.find((r) => r.status === "rejected").reason.status, 409);
  const withName = ["g1", "g2"].filter((u) => db.store.get(`users/${u}`).username === "gina_g");
  assert.equal(withName.length, 1);
  assert.equal(db.store.get("usernames/gina_g").uid, withName[0]);
});

test("the uid can't be spoofed through the body", async () => {
  const db = fakeFirestore();
  seedGoogleUser(db, "g1");
  seedGoogleUser(db, "victim", { name: "Victim" });
  await completeProfile({ db, adminAuth: fakeAdminAuth(), uid: "g1", input: { ...input(), uid: "victim", userId: "victim" }, now: NOW });
  assert.equal(db.store.get("users/victim").username, undefined, "only the verified uid's profile changes");
  assert.equal(db.store.get("users/g1").username, "gina_g");
});
