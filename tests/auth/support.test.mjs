import test from "node:test";
import assert from "node:assert/strict";

import { clientIpKey, SIGNUP_RATE_RULES } from "../../lib/auth/ip.js";
import { friendlyAuthError } from "../../lib/auth/messages.js";
import { safeNextPath } from "../../lib/auth/redirect.js";
import { consumeRateLimit } from "../../lib/zone/rateLimit.js";
import { fakeFirestore } from "../zone/fakeFirestore.mjs";

test("safeNextPath allows same-site paths only", () => {
  for (const ok of ["/zone", "/zone/abc?x=1#top", "/trips/new", "/"]) assert.equal(safeNextPath(ok), ok, ok);
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil", "", null, undefined, 42, "/ok\nSet-Cookie: x", "/login", "/signup?x=1", "/login/"]) {
    assert.equal(safeNextPath(bad), "/dashboard", String(bad));
  }
  assert.equal(safeNextPath("//evil.com", "/home"), "/home", "custom fallback");
  assert.equal(safeNextPath("/loginhelp"), "/loginhelp", "only the real auth pages are blocked");
});

test("firebase error codes become actionable text; popup dismissals are silent", () => {
  for (const code of ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"]) {
    assert.equal(friendlyAuthError(code), "Incorrect email or password.", "must not reveal whether the email exists");
  }
  assert.equal(friendlyAuthError("auth/popup-closed-by-user"), null);
  assert.equal(friendlyAuthError("auth/cancelled-popup-request"), null);
  assert.match(friendlyAuthError("auth/too-many-requests"), /Too many attempts/);
  assert.match(friendlyAuthError("auth/network-request-failed"), /connection/);
  assert.equal(friendlyAuthError("auth/something-new"), "Something went wrong. Please try again.");
  assert.equal(friendlyAuthError(undefined), "Something went wrong. Please try again.");
});

test("ip key: stable, hashed, safe as a document id, takes the first forwarded address", () => {
  const h = (o) => new Headers(o);
  const a = clientIpKey(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }));
  assert.match(a, /^ip_[0-9a-f]{32}$/);
  assert.equal(a, clientIpKey(h({ "x-forwarded-for": "203.0.113.7" })));
  assert.notEqual(a, clientIpKey(h({ "x-forwarded-for": "203.0.113.8" })));
  assert.equal(clientIpKey(h({ "x-real-ip": "1.2.3.4" })), clientIpKey(h({ "x-forwarded-for": "1.2.3.4" })));
  assert.match(clientIpKey(h({})), /^ip_/, "no headers → still a valid key");
  assert.ok(!a.includes("203"), "raw IP never appears");
});

test("signup rate limit: 8 per IP per hour, then 429", async () => {
  const db = fakeFirestore();
  const hit = () => consumeRateLimit({ db, uid: "ip_abc", action: "signup", rules: SIGNUP_RATE_RULES });
  for (let i = 0; i < 8; i++) await hit();
  await assert.rejects(hit(), { status: 429 });
});
