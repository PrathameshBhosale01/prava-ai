import test from "node:test";
import assert from "node:assert/strict";

import {
  addComment, createPost, deleteComment, deletePost, getPost,
  listComments, listPosts, setLike, updateComment, updatePost,
} from "../../lib/zone/service.js";
import { fakeFirestore } from "./fakeFirestore.mjs";

const CLOUD = "democloud";
const img = (n) => `https://res.cloudinary.com/${CLOUD}/image/upload/v1/prava-zone/${n}.jpg`;
const ana = { uid: "ana", name: "Ana Café", photoURL: "" };
const raj = { uid: "raj", name: "Raj", photoURL: "https://x/y.png" };

let tick = 0;
const at = () => new Date(Date.UTC(2026, 9, 1, 0, 0, tick++)); // strictly increasing times

const input = (over = {}) => ({
  title: "Snow Adventures in Manali",
  content: "Manali is a paradise for snow lovers, packed with thrill.",
  category: "Adventure",
  ...over,
});
const make = (db, author = ana, over = {}) => createPost({ db, author, input: input(over), cloudName: CLOUD, now: at() });

test("create → get round trip, author comes from the caller not the body", async () => {
  const db = fakeFirestore();
  const created = await createPost({
    db, author: ana, cloudName: CLOUD, now: at(),
    input: input({ imageUrls: [img("a"), img("b")], coverIndex: 1, author: { uid: "evil", name: "Evil" }, authorUid: "evil", likeCount: 999 }),
  });
  assert.equal(created.author.uid, "ana");
  assert.equal(created.likeCount, 0);
  assert.equal(created.coverImageUrl, img("b"));

  const fetched = await getPost({ db, uid: "ana", postId: created.id });
  assert.equal(fetched.isOwner, true);
  assert.equal(fetched.content, input().content);
  assert.equal((await getPost({ db, uid: "raj", postId: created.id })).isOwner, false);
});

test("invalid input writes nothing", async () => {
  const db = fakeFirestore();
  await assert.rejects(make(db, ana, { title: "" }), { status: 400 });
  assert.equal(db.store.size, 0);
});

test("ids from the URL can't escape into other documents", async () => {
  const db = fakeFirestore();
  for (const postId of ["a/comments/b", "../x", "", "a b"]) {
    await assert.rejects(getPost({ db, postId }), { status: 404 });
  }
  const post = await make(db);
  await assert.rejects(deleteComment({ db, uid: "ana", postId: post.id, commentId: "x/y" }), { status: 404 });
});

test("feed is newest-first and paginates without gaps or repeats", async () => {
  const db = fakeFirestore();
  const ids = [];
  for (let i = 0; i < 7; i++) ids.push((await make(db, ana, { title: `Trip number ${i}` })).id);

  const seen = [];
  let cursor = "";
  let pages = 0;
  do {
    const page = await listPosts({ db, limit: 3, cursor });
    seen.push(...page.posts.map((p) => p.id));
    cursor = page.nextCursor || "";
    pages++;
  } while (cursor);

  assert.deepEqual(seen, [...ids].reverse());
  assert.equal(pages, 3);
});

test("list rows are summaries: no full content", async () => {
  const db = fakeFirestore();
  await make(db);
  const [row] = (await listPosts({ db })).posts;
  assert.equal(row.content, undefined);
  assert.ok(row.excerpt.length > 0);
});

test("category filter", async () => {
  const db = fakeFirestore();
  await make(db, ana, { category: "Beach", title: "Goa beaches" });
  await make(db, ana, { category: "Mountain", title: "Spiti road" });
  const { posts } = await listPosts({ db, category: "Beach" });
  assert.deepEqual(posts.map((p) => p.title), ["Goa beaches"]);
  await assert.rejects(listPosts({ db, category: "Bogus" }), { status: 400 });
});

test("search matches title, category, author and body — ignoring accents, requiring every word", async () => {
  const db = fakeFirestore();
  await make(db, ana, { title: "Weekend in Paris", category: "City Break", content: "Croissants and museums all day long, truly lovely." });
  await make(db, raj, { title: "Hampta Pass", category: "Mountain", content: "Five days above the treeline with a great crew." });

  const titles = async (q) => (await listPosts({ db, q })).posts.map((p) => p.title);
  assert.deepEqual(await titles("PARIS"), ["Weekend in Paris"]);
  assert.deepEqual(await titles("mountain"), ["Hampta Pass"]);
  assert.deepEqual(await titles("cafe"), ["Weekend in Paris"], "author 'Ana Café' matched without the accent");
  assert.deepEqual(await titles("croissants museums"), ["Weekend in Paris"]);
  assert.deepEqual(await titles("paris treeline"), [], "all words must match");
  assert.equal((await titles("")).length, 2);
});

test("only the author can edit; edit reports dropped photos", async () => {
  const db = fakeFirestore();
  const post = await make(db, ana, { imageUrls: [img("a"), img("b")] });

  await assert.rejects(updatePost({ db, uid: "raj", postId: post.id, input: input(), cloudName: CLOUD }), { status: 403 });
  await assert.rejects(updatePost({ db, uid: "ana", postId: "missing", input: input(), cloudName: CLOUD }), { status: 404 });

  const { post: edited, removedImageUrls } = await updatePost({
    db, uid: "ana", postId: post.id, cloudName: CLOUD, now: at(),
    input: input({ title: "Manali, revisited", imageUrls: [img("a")], authorUid: "raj" }),
  });
  assert.equal(edited.title, "Manali, revisited");
  assert.deepEqual(removedImageUrls, [img("b")]);
  assert.ok(edited.updatedAt > edited.createdAt);

  const stored = db.store.get(`blog_posts/${post.id}`);
  assert.equal(stored.authorUid, "ana", "edit must not change ownership");
  assert.equal(stored.createdAt.getTime(), new Date(post.createdAt).getTime());
});

test("an edit that fails validation leaves the post untouched", async () => {
  const db = fakeFirestore();
  const post = await make(db);
  await assert.rejects(updatePost({ db, uid: "ana", postId: post.id, input: input({ title: "" }), cloudName: CLOUD }), { status: 400 });
  assert.equal((await getPost({ db, postId: post.id })).title, post.title);
});

test("likes are idempotent and counted per user", async () => {
  const db = fakeFirestore();
  const { id } = await make(db);

  assert.deepEqual(await setLike({ db, uid: "raj", postId: id, liked: true }), { liked: true, likeCount: 1 });
  assert.deepEqual(await setLike({ db, uid: "raj", postId: id, liked: true }), { liked: true, likeCount: 1 }, "double tap");
  assert.deepEqual(await setLike({ db, uid: "ana", postId: id, liked: true }), { liked: true, likeCount: 2 });
  assert.equal((await getPost({ db, uid: "raj", postId: id })).likedByMe, true);
  assert.equal((await listPosts({ db, uid: "raj" })).posts[0].likedByMe, true);
  assert.equal((await listPosts({ db, uid: "someone" })).posts[0].likedByMe, false);

  assert.deepEqual(await setLike({ db, uid: "raj", postId: id, liked: false }), { liked: false, likeCount: 1 });
  assert.deepEqual(await setLike({ db, uid: "raj", postId: id, liked: false }), { liked: false, likeCount: 1 }, "unlike twice");
  await assert.rejects(setLike({ db, uid: "raj", postId: "nope", liked: true }), { status: 404 });
});

test("many people liking at once never loses a count", async () => {
  const db = fakeFirestore();
  const { id } = await make(db);
  await Promise.all(Array.from({ length: 25 }, (_, i) => setLike({ db, uid: `u${i}`, postId: id, liked: true })));
  assert.equal((await getPost({ db, postId: id })).likeCount, 25);
});

test("comments: add, list oldest-first, count stays in sync", async () => {
  const db = fakeFirestore();
  const post = await make(db);

  const c1 = await addComment({ db, postId: post.id, author: raj, input: { text: "  Looks amazing!  " }, now: at() });
  await addComment({ db, postId: post.id, author: ana, input: { text: "Thanks!" }, now: at() });
  assert.equal(c1.text, "Looks amazing!");
  assert.equal((await getPost({ db, postId: post.id })).commentCount, 2);

  const list = await listComments({ db, uid: "raj", postId: post.id });
  assert.deepEqual(list.map((c) => c.text), ["Looks amazing!", "Thanks!"]);
  assert.deepEqual(list.map((c) => c.canEdit), [true, false]);
  assert.deepEqual(list.map((c) => c.canDelete), [true, false], "raj can't delete ana's comment");
  assert.deepEqual((await listComments({ db, uid: "ana", postId: post.id })).map((c) => c.canDelete), [true, true], "post author can moderate");

  await assert.rejects(addComment({ db, postId: post.id, author: raj, input: { text: " " } }), { status: 400 });
  await assert.rejects(addComment({ db, postId: "missing", author: raj, input: { text: "hi" } }), { status: 404 });
});

test("parallel comments all land and the counter matches", async () => {
  const db = fakeFirestore();
  const post = await make(db);
  await Promise.all(Array.from({ length: 15 }, (_, i) => addComment({ db, postId: post.id, author: raj, input: { text: `c${i}` }, now: at() })));
  assert.equal((await getPost({ db, postId: post.id })).commentCount, 15);
  assert.equal((await listComments({ db, postId: post.id })).length, 15);
});

test("edit comment: author only", async () => {
  const db = fakeFirestore();
  const post = await make(db);
  const c = await addComment({ db, postId: post.id, author: raj, input: { text: "first" }, now: at() });

  await assert.rejects(updateComment({ db, uid: "ana", postId: post.id, commentId: c.id, input: { text: "hacked" } }), { status: 403 });
  const edited = await updateComment({ db, uid: "raj", postId: post.id, commentId: c.id, input: { text: "edited" }, now: at() });
  assert.equal(edited.text, "edited");
  assert.ok(edited.updatedAt);
  await assert.rejects(updateComment({ db, uid: "raj", postId: post.id, commentId: "ghost", input: { text: "x" } }), { status: 404 });
});

test("delete comment: its author or the post's author, nobody else", async () => {
  const db = fakeFirestore();
  const post = await make(db, ana);
  const mine = await addComment({ db, postId: post.id, author: raj, input: { text: "mine" }, now: at() });
  const other = await addComment({ db, postId: post.id, author: raj, input: { text: "other" }, now: at() });

  await assert.rejects(deleteComment({ db, uid: "stranger", postId: post.id, commentId: mine.id }), { status: 403 });
  await deleteComment({ db, uid: "raj", postId: post.id, commentId: mine.id });
  await deleteComment({ db, uid: "ana", postId: post.id, commentId: other.id });

  assert.equal((await getPost({ db, postId: post.id })).commentCount, 0);
  await assert.rejects(deleteComment({ db, uid: "raj", postId: post.id, commentId: mine.id }), { status: 404 }, "already gone");
  assert.equal((await getPost({ db, postId: post.id })).commentCount, 0, "count must not go negative");
});

test("delete post: author only, cascades to comments + likes, returns photos for cleanup", async () => {
  const db = fakeFirestore();
  const post = await make(db, ana, { imageUrls: [img("a")] });
  const keep = await make(db, ana, { title: "A different post" });
  await addComment({ db, postId: post.id, author: raj, input: { text: "hi" }, now: at() });
  await setLike({ db, uid: "raj", postId: post.id, liked: true });
  await addComment({ db, postId: keep.id, author: raj, input: { text: "stay" }, now: at() });

  await assert.rejects(deletePost({ db, uid: "raj", postId: post.id }), { status: 403 });
  assert.deepEqual(await deletePost({ db, uid: "ana", postId: post.id }), { imageUrls: [img("a")] });

  const left = [...db.store.keys()].filter((k) => k.includes(post.id));
  assert.deepEqual(left, [], "no orphaned docs");
  assert.equal((await getPost({ db, postId: keep.id })).commentCount, 1, "other posts untouched");
  await assert.rejects(deletePost({ db, uid: "ana", postId: post.id }), { status: 404 });
});

test("a bad pagination cursor is a 400, not a crash", async () => {
  const db = fakeFirestore();
  await make(db);
  await assert.rejects(listPosts({ db, cursor: "does-not-exist" }), { status: 400 });
  await assert.rejects(listPosts({ db, cursor: "a/b" }), { status: 400 });
});

test("sort by likes / comments, paginated, newest wins ties in search", async () => {
  const db = fakeFirestore();
  const a = await make(db, ana, { title: "Alpha trip story" });
  const b = await make(db, ana, { title: "Bravo trip story" });
  const c = await make(db, ana, { title: "Charlie trip story" });
  for (const u of ["u1", "u2", "u3"]) await setLike({ db, uid: u, postId: a.id, liked: true });
  await setLike({ db, uid: "u1", postId: c.id, liked: true });
  for (let i = 0; i < 2; i++) await addComment({ db, postId: b.id, author: raj, input: { text: `c${i}` }, now: at() });

  const ids = async (opts) => (await listPosts({ db, ...opts })).posts.map((p) => p.id);
  assert.deepEqual(await ids({ sort: "likes" }), [a.id, c.id, b.id]);
  assert.equal((await ids({ sort: "comments" }))[0], b.id, "most-commented first (ties are ordered by id, so only #1 is guaranteed)");

  // pagination under a non-default sort has no gaps or repeats
  const seen = [];
  let cursor = "";
  do {
    const page = await listPosts({ db, sort: "likes", limit: 1, cursor });
    seen.push(...page.posts.map((p) => p.id));
    cursor = page.nextCursor || "";
  } while (cursor);
  assert.deepEqual(seen, [a.id, c.id, b.id]);

  // search re-sorts its matches in memory
  assert.deepEqual(await ids({ q: "trip", sort: "likes" }), [a.id, c.id, b.id]);
  assert.deepEqual(await ids({ q: "trip", sort: "new" }), [c.id, b.id, a.id]);
  await assert.rejects(listPosts({ db, sort: "random" }), { status: 400 });
});

test("author filter returns only that writer's stories (and combines with search/sort)", async () => {
  const db = fakeFirestore();
  await make(db, ana, { title: "Ana in Goa" });
  await make(db, raj, { title: "Raj in Goa" });
  const ana2 = await make(db, ana, { title: "Ana in Spiti" });

  const titles = async (opts) => (await listPosts({ db, ...opts })).posts.map((p) => p.title);
  assert.deepEqual(await titles({ authorUid: "ana" }), ["Ana in Spiti", "Ana in Goa"]);
  assert.deepEqual(await titles({ authorUid: "raj" }), ["Raj in Goa"]);
  assert.deepEqual(await titles({ authorUid: "ana", q: "goa" }), ["Ana in Goa"]);
  assert.deepEqual(await titles({ authorUid: "nobody" }), []);
  await assert.rejects(listPosts({ db, authorUid: "a/b" }), { status: 404 }, "uid can't address other paths");
  assert.ok(ana2.id);
});

test("long (128-char) Firebase uids work for likes", async () => {
  const db = fakeFirestore();
  const { id } = await make(db);
  const uid = "x".repeat(128);
  assert.deepEqual(await setLike({ db, uid, postId: id, liked: true }), { liked: true, likeCount: 1 });
});
