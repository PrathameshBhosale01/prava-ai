import test from "node:test";
import assert from "node:assert/strict";

import { runChatPipeline } from "../../lib/assistant/pipeline.js";
import { encodeEvent, parseNdjsonStream } from "../../lib/assistant/stream.js";
import { buildSnapshot } from "../../lib/assistant/usage.js";
import { CREDIT_COSTS, PLANS } from "../../lib/plans.js";
import { fakeDb } from "./helpers.mjs";

const NOW = new Date("2026-10-04T06:30:00Z");
const FREE = PLANS.free;
const PERIOD = "2026-10";

const chunk = (...parts) => ({ candidates: [{ content: { parts } }] });
async function* stream(chunks) {
  for (const c of chunks) yield c;
}
const apiError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });

const goodArgs = { destination: "Goa, India", startingFrom: "Mumbai", duration: 3, budget: 15000, currency: "INR", travelers: 2 };
const itineraryJson = JSON.stringify({
  summary: "Sun, sand and seafood.",
  days: [{ day: 1, date: "2026-10-18", title: "Arrival", activities: [{ time: "10:00", title: "Check in", description: "Settle in", location: "Calangute" }] }],
});

function setup({ streamChunks, generate, userData = {} } = {}) {
  const db = fakeDb({ u1: userData });
  const calls = { stream: 0, generate: 0 };
  const ai = {
    models: {
      generateContentStream: async () => {
        calls.stream++;
        if (streamChunks instanceof Error) throw streamChunks;
        return stream(streamChunks);
      },
      generateContent: async (req) => {
        calls.generate++;
        return generate ? generate(req) : { text: itineraryJson };
      },
    },
  };
  const events = [];
  const usage = buildSnapshot(userData, NOW);
  const run = () =>
    runChatPipeline({ ai, db, models: ["m1"], uid: "u1", userName: "Asha", contents: [], emit: (e) => events.push(e), usage, now: NOW });
  return { db, calls, events, run };
}

test("plain answers stream text and finish with usage", async () => {
  const t = setup({ streamChunks: [chunk({ text: "Best time is " }), chunk({ text: "Nov–Feb." })] });
  await t.run();
  assert.deepEqual(t.events.map((e) => e.type), ["text", "text", "done"]);
  assert.equal(t.calls.generate, 0, "no itinerary call for a normal question");
  assert.equal(t.events.at(-1).usage.credits.used, 0);
});

test("a tool call produces a validated plan and spends the plan credits", async () => {
  const t = setup({
    streamChunks: [chunk({ text: "Great, building your plan now." }), chunk({ functionCall: { name: "create_trip_plan", args: goodArgs } })],
  });
  await t.run();

  const types = t.events.map((e) => e.type);
  assert.deepEqual(types, ["text", "status", "plan", "done"]);

  const plan = t.events.find((e) => e.type === "plan").plan;
  assert.equal(plan.trip.destination, "Goa, India");
  assert.equal(plan.trip.title, "3-Day Goa Trip");
  assert.equal(plan.itinerary.days[0].activities[0].title, "Check in");
  assert.equal(t.events.at(-1).usage.credits.used, CREDIT_COSTS.plan);
  assert.deepEqual(t.db.store.get("u1").aiCredits, { period: PERIOD, used: CREDIT_COSTS.plan });
});

test("adds a closing sentence when the model said nothing before the tool call", async () => {
  const t = setup({ streamChunks: [chunk({ functionCall: { name: "create_trip_plan", args: goodArgs } })] });
  await t.run();
  const text = t.events.filter((e) => e.type === "text").map((e) => e.delta).join("");
  assert.match(text, /3-day plan for Goa, India/);
});

test("incomplete tool arguments become a clarifying message, not a plan", async () => {
  const t = setup({ streamChunks: [chunk({ functionCall: { name: "create_trip_plan", args: { ...goodArgs, duration: 90 } } })] });
  await t.run();
  assert.equal(t.events.some((e) => e.type === "plan"), false);
  assert.match(t.events.find((e) => e.type === "text").delta, /1 to 21 days/);
  assert.equal(t.calls.generate, 0);
  assert.equal(t.db.store.get("u1").aiCredits, undefined, "no credits may be consumed");
});

test("unknown tools are ignored", async () => {
  const t = setup({ streamChunks: [chunk({ functionCall: { name: "delete_everything", args: {} } })] });
  await t.run();
  assert.deepEqual(t.events.map((e) => e.type), ["done"]);
  assert.equal(t.calls.generate, 0);
});

test("not enough credits for a plan explains why, mentions Pro, and skips generation", async () => {
  const t = setup({
    userData: { aiCredits: { period: PERIOD, used: FREE.credits - 2 } },
    streamChunks: [chunk({ functionCall: { name: "create_trip_plan", args: goodArgs } })],
  });
  await t.run();
  assert.equal(t.calls.generate, 0);
  const text = t.events.find((e) => e.type === "text").delta;
  assert.match(text, new RegExp(`needs ${CREDIT_COSTS.plan} AI credits and you have 2 left`));
  assert.match(text, /Upgrade to Pro/);
  assert.equal(t.events.at(-1).usage.credits.remaining, 2);
});

test("Free plan: a trip longer than the plan allows is declined before any credits are spent", async () => {
  const t = setup({ streamChunks: [chunk({ functionCall: { name: "create_trip_plan", args: { ...goodArgs, duration: 15 } } })] });
  await t.run();
  assert.equal(t.calls.generate, 0);
  assert.equal(t.events.some((e) => e.type === "plan"), false);
  assert.match(t.events.find((e) => e.type === "text").delta, /up to 10 days/);
  assert.equal(t.db.store.get("u1").aiCredits, undefined);
});

test("Free plan: more than 3 cities is declined; Pro can plan it", async () => {
  const stops = ["Delhi", "Agra", "Jaipur", "Udaipur"].map((place) => ({ place, nights: 2 }));
  const free = setup({ streamChunks: [chunk({ functionCall: { name: "create_trip_plan", args: { ...goodArgs, stops } } })] });
  await free.run();
  assert.match(free.events.find((e) => e.type === "text").delta, /up to 3 cities/);
  assert.equal(free.calls.generate, 0);

  const pro = setup({
    userData: { subscription: { plan: "pro", status: "active" } },
    streamChunks: [chunk({ functionCall: { name: "create_trip_plan", args: { ...goodArgs, stops } } })],
    generate: () => { throw new Error("stop here"); }, // we only care that Pro got past the checks
  });
  await pro.run();
  assert.equal(pro.calls.generate > 0, true, "Pro reached generation");
});

test("itinerary failure refunds the credits and reports an error", async () => {
  const t = setup({
    streamChunks: [chunk({ functionCall: { name: "create_trip_plan", args: goodArgs } })],
    generate: () => ({ text: "garbage" }),
  });
  await t.run();
  assert.equal(t.events.some((e) => e.type === "plan"), false);
  assert.match(t.events.find((e) => e.type === "error").message, /itinerary/i);
  assert.equal(t.db.store.get("u1").aiCredits.used, 0);
  assert.equal(t.events.at(-1).usage.credits.used, 0);
});

test("upstream failure before any output refunds the message", async () => {
  const db = fakeDb({ u1: { aiCredits: { period: PERIOD, used: 1 } } });
  const events = [];
  const ai = { models: { generateContentStream: async () => Promise.reject(apiError(400)) } };
  await runChatPipeline({
    ai, db, models: ["m1"], uid: "u1", contents: [], emit: (e) => events.push(e), now: NOW,
    usage: buildSnapshot({ aiCredits: { period: PERIOD, used: 1 } }, NOW),
  });
  assert.equal(events[0].type, "error");
  assert.equal(events.at(-1).type, "done");
  assert.equal(events.at(-1).usage.credits.used, 0);
  assert.equal(db.store.get("u1").aiCredits.used, 0);
});

test("busy errors get a friendly message and never leak internals", async () => {
  const t = setup({ streamChunks: apiError(503) });
  await t.run();
  const error = t.events.find((e) => e.type === "error");
  assert.match(error.message, /busy/i);
  assert.doesNotMatch(error.message, /503/);
});

test("an aborted request ends quietly", async () => {
  const controller = new AbortController();
  const events = [];
  const ai = {
    models: {
      generateContentStream: async () => {
        controller.abort();
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      },
    },
  };
  await runChatPipeline({
    ai, db: fakeDb({ u1: {} }), models: ["m1"], uid: "u1", contents: [], signal: controller.signal,
    emit: (e) => events.push(e), usage: buildSnapshot({}, NOW), now: NOW,
  });
  assert.deepEqual(events, []);
});

// ── wire format ─────────────────────────────────────────────────────────────

test("NDJSON round-trips even when network chunks split lines and characters", async () => {
  const events = [
    { type: "text", delta: "Namaste 🙏 – ₹15,000" },
    { type: "status", status: "planning" },
    { type: "done", usage: { plan: "free" } },
  ];
  const bytes = new TextEncoder().encode(events.map(encodeEvent).join(""));

  // Deliver in awkward 7-byte slices (splits lines and multi-byte characters).
  const body = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
      controller.close();
    },
  });

  const parsed = [];
  for await (const event of parseNdjsonStream(body)) parsed.push(event);
  assert.deepEqual(parsed, events);
});

test("parser skips malformed lines and handles a missing trailing newline", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"type":"text","delta":"a"}\nnot json\n{"type":"done"}'));
      controller.close();
    },
  });
  const parsed = [];
  for await (const event of parseNdjsonStream(body)) parsed.push(event);
  assert.deepEqual(parsed.map((e) => e.type), ["text", "done"]);
});