import test from "node:test";
import assert from "node:assert/strict";

import {
  INTEREST_OPTIONS, passwordStrength, validateEmail, validateInterests, validateLogin,
  validateName, validatePassword, validateSignup, validateUsername,
} from "../../lib/auth/validation.js";

const good = { email: "Ana@Example.com ", password: "hunter2hunter2", name: "  Ana   Rao ", username: "@Ana_Rao", interests: INTEREST_OPTIONS.slice(0, 3) };

test("a valid sign-up is cleaned: email lowercased, name collapsed, '@' dropped from username", () => {
  const { values, fields } = validateSignup(good);
  assert.deepEqual(fields, {});
  assert.deepEqual([values.email, values.name, values.username], ["ana@example.com", "Ana Rao", "ana_rao"]);
});

test("every bad field is reported at once", () => {
  const { fields } = validateSignup({ email: "nope", password: "short", name: "A", username: "x", interests: [] });
  assert.deepEqual(Object.keys(fields).sort(), ["email", "interests", "name", "password", "username"]);
});

test("non-object bodies never crash", () => {
  for (const body of [null, undefined, "x", 42, []]) assert.equal(Object.keys(validateSignup(body).fields).length, 5);
});

test("email", () => {
  for (const ok of ["a@b.co", "first.last+tag@sub.example.org"]) assert.equal(validateEmail(ok).error, "", ok);
  for (const bad of ["", "   ", "a@b", "a b@c.com", "@x.com", "a@.com", `${"a".repeat(250)}@b.com`]) assert.ok(validateEmail(bad).error, bad);
});

test("password: length, letter+number, never trimmed", () => {
  assert.equal(validatePassword("abcdefg1").error, "");
  assert.match(validatePassword("abc1").error, /at least 8/);
  assert.match(validatePassword("abcdefgh").error, /letter and one number/);
  assert.match(validatePassword("12345678").error, /letter and one number/);
  assert.match(validatePassword("a1".repeat(70)).error, /under 128/);
  assert.equal(validatePassword("  abc12345  ").value, "  abc12345  ");
  assert.equal(validatePassword(undefined).error, "Create a password.");
});

test("password strength meter", () => {
  assert.deepEqual(passwordStrength(""), { score: 0, label: "" });
  assert.equal(passwordStrength("abc").score, 0);
  assert.equal(passwordStrength("password123").score, 0, "common passwords are always too weak");
  assert.equal(passwordStrength("Password1").label, "Too weak", "mixed-case + digit, but on the common list");
  assert.equal(passwordStrength("abcdefgh").label, "Weak");
  assert.equal(passwordStrength("Sunshine9").label, "Okay");
  const scores = ["abcdefg1", "abcdefgh1234", "Abcdefgh1234", "Abcdefgh12!@"].map((p) => passwordStrength(p).score);
  assert.deepEqual([...scores].sort(), scores, "stronger passwords never score lower");
  assert.equal(passwordStrength("Tr0ub4dor&3xyz!").label, "Strong");
});

test("name", () => {
  assert.equal(validateName("Ana\u0000 Rao").value, "Ana Rao", "control characters stripped");
  assert.ok(validateName("").error && validateName("A").error && validateName("x".repeat(41)).error);
  assert.equal(validateName("x".repeat(40)).error, "", "40 is allowed (matches the Firestore rule)");
});

test("username: lowercased, 3–20 of a-z 0-9 _, reserved names refused", () => {
  assert.equal(validateUsername("@@Xyz_123").value, "xyz_123");
  for (const ok of ["abc", "a_b_c_1", "x".repeat(20)]) assert.equal(validateUsername(ok).error, "", ok);
  for (const bad of ["", "ab", "x".repeat(21), "has space", "dots.not.ok", "emoji😀", "hy-phen"]) assert.ok(validateUsername(bad).error, bad);
  for (const reserved of ["admin", "Support", "@PRAVA", "zone"]) assert.match(validateUsername(reserved).error, /isn't available/, reserved);
});

test("interests: from the list, de-duplicated, at least 3", () => {
  assert.equal(validateInterests(INTEREST_OPTIONS.slice(0, 3)).error, "");
  assert.match(validateInterests(INTEREST_OPTIONS.slice(0, 2)).error, /at least 3/);
  assert.match(validateInterests([INTEREST_OPTIONS[0], INTEREST_OPTIONS[0], INTEREST_OPTIONS[0]]).error, /at least 3/, "duplicates don't count twice");
  assert.match(validateInterests([...INTEREST_OPTIONS.slice(0, 3), "Hacking"]).error, /from the list/);
  assert.match(validateInterests("Beaches").error, /at least 3/);
  assert.equal(INTEREST_OPTIONS.length, 13, "fits the Firestore rule: preferences ≤ 13");
});

test("login only checks shape; the server decides if credentials are right", () => {
  assert.deepEqual(validateLogin({ email: "a@b.co", password: "x" }).fields, {});
  const { fields } = validateLogin({ email: "bad", password: "" });
  assert.deepEqual(Object.keys(fields).sort(), ["email", "password"]);
});
