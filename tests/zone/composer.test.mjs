import test from "node:test";
import assert from "node:assert/strict";

import { applyFormat, buildPayload, draftKey, fitWithin, isDirty, moveItem, parseDraft } from "../../lib/zone/composer.js";
import { validateTextFields } from "../../lib/zone/validation.js";

test("bold/italic wrap the selection, or insert a selected placeholder", () => {
  assert.deepEqual(applyFormat("go to Goa now", 6, 9, "bold"), { text: "go to **Goa** now", start: 8, end: 11 });
  const r = applyFormat("hi ", 3, 3, "italic");
  assert.equal(r.text, "hi *italic text*");
  assert.equal(r.text.slice(r.start, r.end), "italic text", "placeholder is selected so typing replaces it");
});

test("link wraps the selection as the label", () => {
  const r = applyFormat("see Spiti", 4, 9, "link");
  assert.equal(r.text, "see [Spiti](https://)");
  assert.equal(r.text.slice(r.start, r.end), "Spiti");
});

test("heading/list/quote prefix every selected line and toggle off again", () => {
  const text = "one\ntwo\nthree";
  const on = applyFormat(text, 0, 7, "list"); // selects "one\ntwo"
  assert.equal(on.text, "- one\n- two\nthree");
  const off = applyFormat(on.text, on.start, on.end, "list");
  assert.equal(off.text, text);
  assert.equal(applyFormat("title", 2, 2, "heading").text, "## title");
  assert.equal(applyFormat("a\nb", 3, 3, "quote").text, "a\n> b", "only the cursor's line");
});

test("unknown format is a no-op", () => {
  assert.deepEqual(applyFormat("x", 0, 1, "nope"), { text: "x", start: 0, end: 1 });
});

test("moveItem reorders without mutating, and ignores bad indexes", () => {
  const list = ["a", "b", "c"];
  assert.deepEqual(moveItem(list, 0, 2), ["b", "c", "a"]);
  assert.deepEqual(list, ["a", "b", "c"]);
  assert.equal(moveItem(list, 0, 3), list);
  assert.equal(moveItem(list, -1, 1), list);
  assert.equal(moveItem(list, 1, 1), list);
});

test("fitWithin shrinks to the longest edge and never upscales", () => {
  assert.deepEqual(fitWithin(4000, 3000, 2000), { width: 2000, height: 1500 });
  assert.deepEqual(fitWithin(3000, 4000, 2000), { width: 1500, height: 2000 });
  assert.deepEqual(fitWithin(800, 600, 2000), { width: 800, height: 600 });
});

const photo = (id, status = "done") => ({ id, url: `https://x/${id}.jpg`, status });

test("payload only includes finished uploads; cover index is relative to them", () => {
  const photos = [photo("a"), photo("b", "uploading"), photo("c"), photo("d", "error")];
  const p = buildPayload({ values: { title: "T", content: "C", category: "Beach" }, photos, coverId: "c" });
  assert.deepEqual(p.imageUrls, ["https://x/a.jpg", "https://x/c.jpg"]);
  assert.equal(p.coverIndex, 1);
  assert.equal(buildPayload({ values: { title: "", content: "", category: "" }, photos, coverId: "zzz" }).coverIndex, 0, "unknown cover → first");
  assert.equal(buildPayload({ values: { title: "", content: "", category: "" }, photos: [], coverId: null }).coverIndex, 0);
});

test("isDirty ignores surrounding whitespace but sees real edits", () => {
  const base = { title: "Trip", content: "Body", category: "Beach", imageUrls: ["u"], coverIndex: 0 };
  assert.equal(isDirty({ ...base, title: "  Trip " }, base), false);
  assert.equal(isDirty({ ...base, content: "Body!" }, base), true);
  assert.equal(isDirty({ ...base, imageUrls: [] }, base), true);
  assert.equal(isDirty({ ...base, coverIndex: 1 }, base), true);
});

test("parseDraft rejects junk and empty drafts, sanitises the rest", () => {
  for (const raw of [null, "", "{not json", "42", "null", JSON.stringify({ title: "  ", content: "" })]) assert.equal(parseDraft(raw), null, String(raw));
  const d = parseDraft(JSON.stringify({ title: "Hi", content: "Body", category: "Hacked", imageUrls: ["u1", 5, "u2"], coverIndex: 9 }));
  assert.deepEqual(d, { title: "Hi", content: "Body", category: "", imageUrls: ["u1", "u2"], coverIndex: 0 });
  assert.equal(draftKey("u1"), "zone-draft:u1");
  assert.equal(draftKey(""), "zone-draft:anon");
});

test("form and server share one set of text rules", () => {
  const bad = validateTextFields({ title: "x", content: "short", category: "Nope" });
  assert.deepEqual(Object.keys(bad.fields).sort(), ["category", "content", "title"]);
  const ok = validateTextFields({ title: "  A  trip ", content: "x".repeat(30), category: "Beach" });
  assert.deepEqual(ok.fields, {});
  assert.equal(ok.values.title, "A trip");
});
