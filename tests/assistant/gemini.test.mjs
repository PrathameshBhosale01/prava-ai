import test from "node:test";
import assert from "node:assert/strict";

import { generateItinerary, streamAssistantReply } from "../../lib/assistant/gemini.js";
import { normalizeItinerary, parseJsonLoose } from "../../lib/assistant/itinerary.js";

const chunk = (...parts) => ({ candidates: [{ content: { parts } }] });
async function* asStream(chunks, failAfter) {
  let i = 0;
  for (const c of chunks) {
    if (failAfter !== undefined && i++ === failAfter) throw Object.assign(new Error("boom"), { status: 503 });
    yield c;
  }
}
const apiError = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
const collect = async (iterable) => {
  const out = [];
  for await (const item of iterable) out.push(item);
  return out;
};
const base = { contents: [], systemInstruction: "x", retryDelayMs: 0 };

test("streams text and tool calls, ignoring thought parts", async () => {
  const ai = {
    models: {
      generateContentStream: async () =>
        asStream([
          chunk({ text: "Hel" }),
          chunk({ text: "lo", thought: false }, { text: "secret", thought: true }),
          chunk({ functionCall: { name: "create_trip_plan", args: { destination: "Goa" } } }),
        ]),
    },
  };
  const out = await collect(streamAssistantReply({ ...base, ai, models: ["m1"] }));
  assert.deepEqual(out, [
    { type: "text", text: "Hel" },
    { type: "text", text: "lo" },
    { type: "tool", name: "create_trip_plan", args: { destination: "Goa" } },
  ]);
});

test("passes system instruction, tool and abort signal to the SDK", async () => {
  let seen;
  const ai = { models: { generateContentStream: async (req) => ((seen = req), asStream([])) } };
  const controller = new AbortController();
  await collect(streamAssistantReply({ ...base, ai, models: ["m1"], signal: controller.signal }));
  assert.equal(seen.model, "m1");
  assert.equal(seen.config.systemInstruction, "x");
  assert.equal(seen.config.tools[0].functionDeclarations[0].name, "create_trip_plan");
  assert.equal(seen.config.abortSignal, controller.signal);
});

test("retries a transient error before any output, then succeeds", async () => {
  let calls = 0;
  const ai = {
    models: {
      generateContentStream: async () => {
        if (calls++ === 0) throw apiError(503);
        return asStream([chunk({ text: "ok" })]);
      },
    },
  };
  const out = await collect(streamAssistantReply({ ...base, ai, models: ["m1"] }));
  assert.equal(calls, 2);
  assert.deepEqual(out, [{ type: "text", text: "ok" }]);
});

test("falls back to the next model when the first is missing (404)", async () => {
  const used = [];
  const ai = {
    models: {
      generateContentStream: async ({ model }) => {
        used.push(model);
        if (model === "retired") throw apiError(404);
        return asStream([chunk({ text: "from fallback" })]);
      },
    },
  };
  const out = await collect(streamAssistantReply({ ...base, ai, models: ["retired", "good"] }));
  assert.deepEqual(used, ["retired", "good"]);
  assert.equal(out[0].text, "from fallback");
});

test("does not restart once output has been streamed", async () => {
  let calls = 0;
  const ai = {
    models: {
      generateContentStream: async () => (calls++, asStream([chunk({ text: "partial" }), chunk({ text: "never" })], 1)),
    },
  };
  const seen = [];
  await assert.rejects(async () => {
    for await (const part of streamAssistantReply({ ...base, ai, models: ["m1", "m2"] })) seen.push(part);
  }, /boom/);
  assert.equal(calls, 1);
  assert.deepEqual(seen, [{ type: "text", text: "partial" }]);
});

test("non-retryable errors surface immediately", async () => {
  let calls = 0;
  const ai = { models: { generateContentStream: async () => (calls++, Promise.reject(apiError(400))) } };
  await assert.rejects(collect(streamAssistantReply({ ...base, ai, models: ["a", "b"] })), /HTTP 400/);
  assert.equal(calls, 1);
});

test("aborts are rethrown without retrying", async () => {
  const controller = new AbortController();
  let calls = 0;
  const ai = {
    models: {
      generateContentStream: async () => {
        calls++;
        controller.abort();
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      },
    },
  };
  await assert.rejects(collect(streamAssistantReply({ ...base, ai, models: ["a"], signal: controller.signal })), /aborted/);
  assert.equal(calls, 1);
});

// ── itinerary ───────────────────────────────────────────────────────────────

const goodItinerary = {
  summary: "Beach weekend",
  days: [{ day: 1, date: "2026-10-18", title: "Arrive", activities: [{ time: "09:00", title: "Breakfast", description: "Cafe", location: "Panjim" }] }],
};
const trip = { title: "t", destination: "Goa", startingFrom: "Mumbai", category: "Leisure", budget: 1, currency: "INR", duration: 1, travelers: 1, startDate: "2026-10-18", interests: [], accommodation: "Hotel", transportation: "Mixed" };

test("parseJsonLoose handles fences and surrounding prose", () => {
  assert.deepEqual(parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLoose('Here you go: {"a":1} enjoy'), { a: 1 });
  assert.throws(() => parseJsonLoose("nope"), /valid JSON/);
  assert.throws(() => parseJsonLoose(""), /Empty/);
});

test("normalizeItinerary cleans messy model output", () => {
  const result = normalizeItinerary({
    summary: "  s  ",
    days: [
      { day: "2", date: "soon", title: "", activities: [{ title: "Hike", time: "10:00" }, { time: "no title" }, null] },
      { day: 3, activities: [] },
    ],
  });
  assert.deepEqual(result, {
    summary: "s",
    days: [{ day: 2, date: "", title: "Day 2", activities: [{ time: "10:00", title: "Hike", description: "", location: "" }] }],
  });
  assert.throws(() => normalizeItinerary({ days: [] }), /no usable days/);
  assert.throws(() => normalizeItinerary(null), /Invalid/);
});

test("generateItinerary returns a validated itinerary", async () => {
  const ai = { models: { generateContent: async () => ({ text: "```json\n" + JSON.stringify(goodItinerary) + "\n```" }) } };
  const result = await generateItinerary({ ai, models: ["m1"], trip, retryDelayMs: 0 });
  assert.equal(result.days[0].activities[0].title, "Breakfast");
});

test("generateItinerary retries malformed JSON and 503s", async () => {
  const replies = [() => ({ text: "not json" }), () => Promise.reject(apiError(503)), () => ({ text: JSON.stringify(goodItinerary) })];
  let i = 0;
  const ai = { models: { generateContent: async () => replies[Math.min(i++, 2)]() } };
  const result = await generateItinerary({ ai, models: ["m1", "m2"], trip, retryDelayMs: 0 });
  assert.equal(result.summary, "Beach weekend");
  assert.equal(i, 3);
});

test("generateItinerary gives up with the last error", async () => {
  const ai = { models: { generateContent: async () => ({ text: "still not json" }) } };
  await assert.rejects(generateItinerary({ ai, models: ["m1"], trip, retryDelayMs: 0 }), /valid JSON/);
});