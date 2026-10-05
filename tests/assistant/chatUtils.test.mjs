import test from "node:test";
import assert from "node:assert/strict";

import {
  deriveTitle,
  groupChatsByDate,
  newId,
  previewOf,
  toApiMessages,
  toStoredMessage,
} from "../../lib/assistant/chatUtils.js";

test("newId returns unique non-empty strings", () => {
  const ids = new Set(Array.from({ length: 50 }, newId));
  assert.equal(ids.size, 50);
  assert.ok([...ids].every((id) => typeof id === "string" && id.length > 8));
});

test("deriveTitle collapses whitespace and truncates", () => {
  assert.equal(deriveTitle("  Plan   a\ntrip  "), "Plan a trip");
  assert.equal(deriveTitle(""), "New chat");
  const long = deriveTitle("a".repeat(100));
  assert.equal(long.length, 48);
  assert.ok(long.endsWith("…"));
});

test("previewOf strips markdown noise", () => {
  assert.equal(previewOf("**Best time:** Nov to Feb\n\n> note"), "Best time: Nov to Feb note");
});

test("toApiMessages skips failures and annotates generated plans", () => {
  const messages = [
    { role: "user", content: "plan goa" },
    { role: "assistant", content: "Building now.", plan: { trip: { duration: 3, destination: "Goa" }, itinerary: {} } },
    { role: "user", content: "again" },
    { role: "assistant", content: "", error: "busy" },
    { role: "assistant", content: "typing", pending: true },
    { role: "user", content: "   " },
  ];
  const out = toApiMessages(messages);
  assert.deepEqual(out.map((m) => m.role), ["user", "assistant", "user"]);
  assert.match(out[1].content, /3-day plan for Goa was generated/);
  assert.equal(JSON.stringify(out).includes("itinerary"), false, "plan JSON must not be sent back");
});

test("toStoredMessage drops transient UI flags", () => {
  const stored = toStoredMessage({
    id: "m1", role: "assistant", content: "hi", createdAt: 5,
    pending: false, phase: "streaming", plan: undefined, error: undefined,
  });
  assert.deepEqual(stored, { id: "m1", role: "assistant", content: "hi", createdAt: 5 });
  assert.equal(toStoredMessage({ id: "m", role: "assistant", createdAt: 1, stopped: true }).stopped, true);
});

test("groupChatsByDate buckets by local calendar day", () => {
  const now = new Date(2026, 9, 4, 15, 0); // local 4 Oct 15:00
  const at = (daysAgo, hour = 10) => new Date(2026, 9, 4 - daysAgo, hour).getTime();
  const chats = [
    { id: "a", updatedAt: at(0) },
    { id: "b", updatedAt: at(1, 23) },
    { id: "c", updatedAt: at(5) },
    { id: "d", updatedAt: at(30) },
  ];
  const groups = groupChatsByDate(chats, now);
  assert.deepEqual(groups.map((g) => [g.label, g.items.map((c) => c.id)]), [
    ["Today", ["a"]],
    ["Yesterday", ["b"]],
    ["Previous 7 days", ["c"]],
    ["Older", ["d"]],
  ]);
  assert.deepEqual(groupChatsByDate([], now), []);
});