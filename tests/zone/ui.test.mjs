import test from "node:test";
import assert from "node:assert/strict";

import { formatPostDate, initials, plural } from "../../lib/zone/format.js";
import { feedReducer, initialFeedState } from "../../lib/zone/feedState.js";

const NOW = new Date("2026-10-07T12:00:00Z");
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();

test("relative dates", () => {
  assert.equal(formatPostDate(ago(10_000), NOW), "just now");
  assert.equal(formatPostDate(new Date(NOW.getTime() + 60_000).toISOString(), NOW), "just now", "clock skew");
  assert.equal(formatPostDate(ago(5 * 60_000), NOW), "5m ago");
  assert.equal(formatPostDate(ago(3 * 3_600_000), NOW), "3h ago");
  assert.equal(formatPostDate(ago(2 * 86_400_000), NOW), "2d ago");
});

test("older dates show the day; other years show the year", () => {
  assert.match(formatPostDate("2026-07-09T10:00:00Z", NOW), /^Jul 9$/);
  assert.match(formatPostDate("2025-04-06T10:00:00Z", NOW), /^Apr 6, 2025$/);
});

test("bad dates render as empty, never 'Invalid Date'", () => {
  for (const v of [undefined, null, "", "nonsense"]) assert.equal(formatPostDate(v, NOW), "");
});

test("initials and plural", () => {
  assert.equal(initials("Ana Café"), "AC");
  assert.equal(initials("raj"), "R");
  assert.equal(initials("Mary Jane Watson"), "MW");
  assert.equal(initials("  "), "?");
  assert.equal(initials(undefined), "?");
  assert.equal(plural(1, "comment"), "1 comment");
  assert.equal(plural(0, "comment"), "0 comments");
});

const post = (id, over = {}) => ({ id, likedByMe: false, likeCount: 0, ...over });
const withPosts = (...posts) => feedReducer(initialFeedState, { type: "loaded", key: "k1", posts, nextCursor: "c1" });

test("loads, appends and de-duplicates pages", () => {
  let s = withPosts(post("a"), post("b"));
  assert.equal(s.status, "ready");
  s = feedReducer(s, { type: "more-start" });
  assert.equal(s.loadingMore, true);
  assert.equal(s.posts.length, 2, "existing posts stay visible while loading more");
  s = feedReducer(s, { type: "more-loaded", key: "k1", posts: [post("b"), post("c")], nextCursor: null });
  assert.deepEqual(s.posts.map((p) => p.id), ["a", "b", "c"]);
  assert.equal(s.nextCursor, null);
  assert.equal(s.loadingMore, false);
});

test("a failed 'load more' keeps the feed and cursor so the user can retry", () => {
  let s = withPosts(post("a"));
  s = feedReducer(feedReducer(s, { type: "more-start" }), { type: "more-failed" });
  assert.equal(s.status, "ready");
  assert.equal(s.nextCursor, "c1");
  assert.equal(s.loadingMore, false);
});

test("a failed load is an error state for that key; a newer success replaces it", () => {
  let s = feedReducer(initialFeedState, { type: "failed", key: "k1", error: "boom" });
  assert.deepEqual([s.status, s.error, s.key], ["error", "boom", "k1"]);
  s = feedReducer(s, { type: "loaded", key: "k2", posts: [post("a")], nextCursor: null });
  assert.deepEqual([s.status, s.error, s.posts.length], ["ready", "", 1]);
});

test("'load more' results for outdated filters are dropped", () => {
  let s = withPosts(post("a"));
  s = feedReducer(s, { type: "more-start" });
  s = feedReducer(s, { type: "loaded", key: "k2", posts: [post("x")], nextCursor: null }); // filters changed
  s = feedReducer(s, { type: "more-loaded", key: "k1", posts: [post("late")], nextCursor: "zzz" });
  assert.deepEqual(s.posts.map((p) => p.id), ["x"]);
  assert.equal(s.nextCursor, null);
  assert.equal(s.loadingMore, false);
});

test("optimistic like → settle with server numbers", () => {
  let s = withPosts(post("a", { likeCount: 4 }), post("b", { likeCount: 9 }));
  s = feedReducer(s, { type: "like-optimistic", id: "a", liked: true });
  assert.deepEqual([s.posts[0].likedByMe, s.posts[0].likeCount], [true, 5]);
  assert.equal(s.posts[1].likeCount, 9, "other posts untouched");
  s = feedReducer(s, { type: "like-settled", id: "a", liked: true, likeCount: 7 });
  assert.equal(s.posts[0].likeCount, 7);
});

test("optimistic like is idempotent and never goes below zero", () => {
  let s = withPosts(post("a", { likeCount: 0, likedByMe: true }));
  s = feedReducer(s, { type: "like-optimistic", id: "a", liked: true });
  assert.equal(s.posts[0].likeCount, 0, "already liked → no double count");
  s = feedReducer(s, { type: "like-optimistic", id: "a", liked: false });
  assert.equal(s.posts[0].likeCount, 0);
});

test("failed like reverts to the previous values", () => {
  let s = withPosts(post("a", { likeCount: 4 }));
  const previous = { likedByMe: s.posts[0].likedByMe, likeCount: s.posts[0].likeCount };
  s = feedReducer(s, { type: "like-optimistic", id: "a", liked: true });
  s = feedReducer(s, { type: "like-revert", id: "a", previous });
  assert.deepEqual([s.posts[0].likedByMe, s.posts[0].likeCount], [false, 4]);
});

test("like actions for a post that's no longer on screen are ignored", () => {
  const s = withPosts(post("a"));
  assert.deepEqual(feedReducer(s, { type: "like-settled", id: "gone", liked: true, likeCount: 3 }).posts, s.posts);
});

import { formatFullDate, wasEdited } from "../../lib/zone/format.js";
import { commentsReducer, initialCommentsState } from "../../lib/zone/commentsState.js";

test("full dates and 'edited' detection", () => {
  assert.equal(formatFullDate("2026-10-07T12:00:00Z"), "October 7, 2026");
  assert.equal(formatFullDate("nope"), "");
  assert.equal(wasEdited("2026-10-07T12:00:00Z", "2026-10-07T12:00:05Z"), false, "write right after creation isn't an edit");
  assert.equal(wasEdited("2026-10-07T12:00:00Z", "2026-10-08T12:00:00Z"), true);
  assert.equal(wasEdited(null, undefined), false);
});

test("comments: load → add → update → remove, ignoring duplicates", () => {
  const c = (id, text = id) => ({ id, text });
  let s = commentsReducer(initialCommentsState, { type: "loaded", key: "p1", items: [c("a")] });
  assert.equal(s.status, "ready");
  s = commentsReducer(s, { type: "added", comment: c("b") });
  s = commentsReducer(s, { type: "added", comment: c("b") });
  assert.deepEqual(s.items.map((x) => x.id), ["a", "b"]);
  s = commentsReducer(s, { type: "updated", comment: c("a", "edited") });
  assert.equal(s.items[0].text, "edited");
  s = commentsReducer(s, { type: "removed", id: "a" });
  assert.deepEqual(s.items.map((x) => x.id), ["b"]);
  s = commentsReducer(s, { type: "failed", key: "p2", error: "boom" });
  assert.deepEqual([s.status, s.error], ["error", "boom"]);
});
