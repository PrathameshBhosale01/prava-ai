import test from "node:test";
import assert from "node:assert/strict";

import { getPublicIdFromUrl, isAllowedImageUrl } from "../../lib/zone/imageUrls.js";
import { makeExcerpt, normalizeSearchText, readingMinutes, validateCommentInput, validatePostInput } from "../../lib/zone/validation.js";

const CLOUD = "democloud";
const img = (name) => `https://res.cloudinary.com/${CLOUD}/image/upload/v1700000000/prava-zone/${name}.jpg`;
const valid = { title: "Snow in Manali", content: "The cold air and snow-covered landscapes made it unforgettable.", category: "Adventure" };

const fieldsOf = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.fields;
  }
  assert.fail("expected a validation error");
};

test("accepts a minimal valid post and trims it", () => {
  const out = validatePostInput({ ...valid, title: "  Snow   in Manali  " }, { cloudName: CLOUD });
  assert.equal(out.title, "Snow in Manali");
  assert.deepEqual(out.imageUrls, []);
  assert.equal(out.coverIndex, 0);
});

test("reports every bad field at once", () => {
  const fields = fieldsOf(() => validatePostInput({ title: "x", content: "short", category: "Nope" }));
  assert.deepEqual(Object.keys(fields).sort(), ["category", "content", "title"]);
});

test("rejects non-object bodies without crashing", () => {
  for (const body of [null, undefined, "str", 42]) assert.ok(fieldsOf(() => validatePostInput(body)).title);
});

test("images must be our own Cloudinary uploads", () => {
  assert.ok(validatePostInput({ ...valid, imageUrls: [img("a")] }, { cloudName: CLOUD }));
  for (const bad of [
    "http://res.cloudinary.com/democloud/image/upload/prava-zone/a.jpg", // http
    "https://evil.example/prava-zone/a.jpg", // other host
    `https://res.cloudinary.com/othercloud/image/upload/prava-zone/a.jpg`, // other account
    `https://res.cloudinary.com/${CLOUD}/image/upload/somewhere-else/a.jpg`, // other folder
    "not a url",
  ]) {
    assert.ok(fieldsOf(() => validatePostInput({ ...valid, imageUrls: [bad] }, { cloudName: CLOUD })).imageUrls, bad);
  }
});

test("no images are accepted when Cloudinary isn't configured", () => {
  assert.ok(fieldsOf(() => validatePostInput({ ...valid, imageUrls: [img("a")] }, {})).imageUrls);
});

test("caps photos at 6 and de-duplicates", () => {
  const seven = Array.from({ length: 7 }, (_, i) => img(`p${i}`));
  assert.ok(fieldsOf(() => validatePostInput({ ...valid, imageUrls: seven }, { cloudName: CLOUD })).imageUrls);
  assert.equal(validatePostInput({ ...valid, imageUrls: [img("a"), img("a")] }, { cloudName: CLOUD }).imageUrls.length, 1);
});

test("cover index must point at an attached photo", () => {
  const imageUrls = [img("a"), img("b")];
  assert.equal(validatePostInput({ ...valid, imageUrls, coverIndex: 1 }, { cloudName: CLOUD }).coverIndex, 1);
  for (const coverIndex of [2, -1, 1.5, "1"]) {
    assert.ok(fieldsOf(() => validatePostInput({ ...valid, imageUrls, coverIndex }, { cloudName: CLOUD })).coverImage);
  }
});

test("comments are trimmed and length-checked", () => {
  assert.equal(validateCommentInput({ text: "  nice!  " }), "nice!");
  assert.throws(() => validateCommentInput({ text: "   " }));
  assert.throws(() => validateCommentInput({ text: "a".repeat(1001) }));
  assert.throws(() => validateCommentInput(undefined));
});

test("search text is accent- and case-insensitive", () => {
  assert.equal(normalizeSearchText("  Café   DÉJÀ  "), "cafe deja");
  assert.equal(normalizeSearchText(null), "");
});

test("excerpt strips markdown and cuts on a word boundary", () => {
  assert.equal(makeExcerpt("# Hi\n**bold** and [a link](https://x.y) ![img](https://i.m/a.png)"), "Hi bold and a link");
  const long = makeExcerpt("word ".repeat(100), 50);
  assert.ok(long.length <= 51 && long.endsWith("…") && !long.includes("wor…"), long);
});

test("reading time is at least a minute", () => {
  assert.equal(readingMinutes("hello"), 1);
  assert.equal(readingMinutes("word ".repeat(600)), 3);
});

test("public id extraction only works for our own uploads", () => {
  assert.equal(getPublicIdFromUrl(img("abc"), CLOUD), "prava-zone/abc");
  assert.equal(getPublicIdFromUrl(`https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,w_400/v12/prava-zone/x.y.png`, CLOUD), "prava-zone/x.y");
  assert.equal(getPublicIdFromUrl("https://res.cloudinary.com/democloud/image/upload/other/abc.jpg", CLOUD), "");
  assert.equal(isAllowedImageUrl(img("a"), ""), false);
});
