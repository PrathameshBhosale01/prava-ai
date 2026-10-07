import { CATEGORIES, LIMITS } from "./constants.js";
import { badRequest, forbidden, notFound } from "./errors.js";
import {
  makeExcerpt,
  normalizeSearchText,
  readingMinutes,
  validateCommentInput,
  validatePostInput,
} from "./validation.js";

// Firestore layout (all access goes through the Admin SDK on the server):
//   blog_posts/{postId}                 post + denormalised author + counters
//   blog_posts/{postId}/comments/{id}   one doc per comment (no 1MB array doc)
//   blog_posts/{postId}/likes/{uid}     existence = "this user liked it"
//
// `db` is the Admin SDK Firestore instance, injected so tests can pass a fake.
// Timestamps are written as plain Dates (the SDK stores them as Timestamps).

const POSTS = "blog_posts";
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Ids come from the URL. Without this check "x/comments/y" would let a caller
// address documents outside the one they asked for.
function assertId(id, what = "Post") {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) throw notFound(what);
  return id;
}

const postRef = (db, id) => db.collection(POSTS).doc(assertId(id));

const toDate = (value) => (value?.toDate ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null);
const toIso = (value) => toDate(value)?.toISOString() ?? null;

/* ----------------------------- serialisation ----------------------------- */

function serializePost(snap, { full = false, viewerUid = "", likedByMe = false } = {}) {
  const d = snap.data();
  const imageUrls = Array.isArray(d.imageUrls) ? d.imageUrls : [];
  const post = {
    id: snap.id,
    title: d.title,
    excerpt: d.excerpt || makeExcerpt(d.content),
    category: d.category,
    coverImageUrl: d.coverImageUrl || imageUrls[0] || "",
    imageCount: imageUrls.length,
    author: { uid: d.author?.uid || d.authorUid, name: d.author?.name || "Traveler", photoURL: d.author?.photoURL || "" },
    likeCount: d.likeCount ?? 0,
    commentCount: d.commentCount ?? 0,
    readingMinutes: d.readingMinutes ?? 1,
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
    likedByMe,
    isOwner: Boolean(viewerUid) && d.authorUid === viewerUid,
  };
  if (full) {
    post.content = d.content;
    post.imageUrls = imageUrls;
  }
  return post;
}

function serializeComment(snap, { viewerUid = "", postAuthorUid = "" } = {}) {
  const d = snap.data();
  return {
    id: snap.id,
    text: d.text,
    author: { uid: d.authorUid, name: d.author?.name || "Traveler", photoURL: d.author?.photoURL || "" },
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt),
    canEdit: Boolean(viewerUid) && d.authorUid === viewerUid,
    canDelete: Boolean(viewerUid) && (d.authorUid === viewerUid || postAuthorUid === viewerUid),
  };
}

// Fields derived from user input. Shared by create + update so they can't drift.
function contentFields(clean, authorName) {
  const excerpt = makeExcerpt(clean.content);
  return {
    title: clean.title,
    content: clean.content,
    excerpt,
    category: clean.category,
    imageUrls: clean.imageUrls,
    coverImageUrl: clean.imageUrls[clean.coverIndex] ?? "",
    readingMinutes: readingMinutes(clean.content),
    // One normalised blob that search matches against (see listPosts).
    searchText: normalizeSearchText(
      [clean.title, clean.category, authorName, clean.content.slice(0, LIMITS.searchTextContentChars)].join(" "),
    ),
  };
}

async function likedPostIds(db, uid, docs) {
  if (!uid || docs.length === 0) return new Set();
  const refs = docs.map((d) => postRef(db, d.id).collection("likes").doc(uid));
  const snaps = await db.getAll(...refs);
  return new Set(docs.filter((_, i) => snaps[i].exists).map((d) => d.id));
}

async function deleteCollection(db, collectionRef) {
  for (;;) {
    const snap = await collectionRef.limit(400).get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

/* --------------------------------- posts --------------------------------- */

/**
 * Newest-first feed.
 *  - no `q`: cursor pagination (cursor = id of the last post you received).
 *  - with `q`: scans the newest LIMITS.searchScan posts and returns the matches
 *    (every word must match). No pagination — results are capped.
 *
 * NOTE: `category` + newest-first needs a composite index (category ASC,
 * createdAt DESC). Firestore logs a one-click link to create it on first use.
 */
export async function listPosts({ db, uid = "", q = "", category = "", limit, cursor = "" }) {
  const size = Math.min(Math.max(Math.trunc(Number(limit)) || LIMITS.pageSize.default, 1), LIMITS.pageSize.max);
  if (category && !CATEGORIES.includes(category)) throw badRequest("Unknown category.");

  let query = db.collection(POSTS);
  if (category) query = query.where("category", "==", category);
  query = query.orderBy("createdAt", "desc");

  const term = normalizeSearchText(q);
  let docs;
  let nextCursor = null;

  if (term) {
    const snap = await query.limit(LIMITS.searchScan).get();
    const words = term.split(" ");
    docs = snap.docs
      .filter((d) => words.every((w) => (d.data().searchText || "").includes(w)))
      .slice(0, LIMITS.searchResults);
  } else {
    if (cursor) {
      let cursorSnap = null;
      try {
        cursorSnap = await postRef(db, cursor).get();
      } catch {
        // malformed id → treated the same as an unknown one below
      }
      if (!cursorSnap?.exists) throw badRequest("Invalid cursor.");
      query = query.startAfter(cursorSnap);
    }
    const snap = await query.limit(size + 1).get();
    docs = snap.docs.slice(0, size);
    if (snap.docs.length > size) nextCursor = docs[docs.length - 1].id;
  }

  const liked = await likedPostIds(db, uid, docs);
  return {
    posts: docs.map((d) => serializePost(d, { viewerUid: uid, likedByMe: liked.has(d.id) })),
    nextCursor,
  };
}

export async function getPost({ db, uid = "", postId }) {
  const snap = await postRef(db, postId).get();
  if (!snap.exists) throw notFound();
  const liked = await likedPostIds(db, uid, [snap]);
  return serializePost(snap, { full: true, viewerUid: uid, likedByMe: liked.has(snap.id) });
}

/** `author` is { uid, name, photoURL } taken from the VERIFIED token, never from the request body. */
export async function createPost({ db, author, input, cloudName, now = new Date() }) {
  const clean = validatePostInput(input, { cloudName });
  const ref = db.collection(POSTS).doc();
  const data = {
    ...contentFields(clean, author.name),
    authorUid: author.uid,
    author: { uid: author.uid, name: author.name, photoURL: author.photoURL || "" },
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(data);
  return serializePost({ id: ref.id, data: () => data }, { full: true, viewerUid: author.uid });
}

/** Author only. Also reports photos that were removed so the caller can delete them from storage. */
export async function updatePost({ db, uid, postId, input, cloudName, now = new Date() }) {
  const ref = postRef(db, postId);
  const snap = await ref.get();
  if (!snap.exists) throw notFound();
  const prev = snap.data();
  if (prev.authorUid !== uid) throw forbidden("Only the author can edit this post.");

  const fields = contentFields(validatePostInput(input, { cloudName }), prev.author?.name);
  await ref.update({ ...fields, updatedAt: now });

  const removedImageUrls = (prev.imageUrls || []).filter((url) => !fields.imageUrls.includes(url));
  const post = serializePost({ id: snap.id, data: () => ({ ...prev, ...fields, updatedAt: now }) }, { full: true, viewerUid: uid });
  return { post, removedImageUrls };
}

/** Author only. Removes the post and its comments/likes; returns its photo URLs for storage cleanup. */
export async function deletePost({ db, uid, postId }) {
  const ref = postRef(db, postId);
  const snap = await ref.get();
  if (!snap.exists) throw notFound();
  const data = snap.data();
  if (data.authorUid !== uid) throw forbidden("Only the author can delete this post.");

  // Children first: if we crash midway the post still exists and a retry finishes the job.
  await deleteCollection(db, ref.collection("comments"));
  await deleteCollection(db, ref.collection("likes"));
  await ref.delete();
  return { imageUrls: data.imageUrls || [] };
}

/** Idempotent: PUT-style "make it liked/unliked", so retries and double taps are harmless. */
export async function setLike({ db, uid, postId, liked, now = new Date() }) {
  const pRef = postRef(db, postId);
  const lRef = pRef.collection("likes").doc(assertId(uid, "User"));

  return db.runTransaction(async (tx) => {
    const post = await tx.get(pRef);
    const like = await tx.get(lRef);
    if (!post.exists) throw notFound();
    const count = post.data().likeCount ?? 0;

    if (liked && !like.exists) {
      tx.set(lRef, { uid, createdAt: now });
      tx.update(pRef, { likeCount: count + 1 });
      return { liked: true, likeCount: count + 1 };
    }
    if (!liked && like.exists) {
      const next = Math.max(count - 1, 0);
      tx.delete(lRef);
      tx.update(pRef, { likeCount: next });
      return { liked: false, likeCount: next };
    }
    return { liked: Boolean(like.exists), likeCount: count };
  });
}

/* -------------------------------- comments ------------------------------- */

export async function listComments({ db, uid = "", postId, limit = 100 }) {
  const pRef = postRef(db, postId);
  const post = await pRef.get();
  if (!post.exists) throw notFound();

  const snap = await pRef.collection("comments").orderBy("createdAt", "asc").limit(Math.min(Math.max(Number(limit) || 100, 1), 200)).get();
  const postAuthorUid = post.data().authorUid;
  return snap.docs.map((d) => serializeComment(d, { viewerUid: uid, postAuthorUid }));
}

export async function addComment({ db, postId, author, input, now = new Date() }) {
  const text = validateCommentInput(input);
  const pRef = postRef(db, postId);
  const cRef = pRef.collection("comments").doc();

  return db.runTransaction(async (tx) => {
    const post = await tx.get(pRef);
    if (!post.exists) throw notFound();
    const data = {
      text,
      authorUid: author.uid,
      author: { uid: author.uid, name: author.name, photoURL: author.photoURL || "" },
      createdAt: now,
    };
    tx.set(cRef, data);
    tx.update(pRef, { commentCount: (post.data().commentCount ?? 0) + 1 });
    return serializeComment({ id: cRef.id, data: () => data }, { viewerUid: author.uid, postAuthorUid: post.data().authorUid });
  });
}

export async function updateComment({ db, uid, postId, commentId, input, now = new Date() }) {
  const text = validateCommentInput(input);
  const pRef = postRef(db, postId);
  const cRef = pRef.collection("comments").doc(assertId(commentId, "Comment"));

  const [post, comment] = await Promise.all([pRef.get(), cRef.get()]);
  if (!post.exists || !comment.exists) throw notFound("Comment");
  if (comment.data().authorUid !== uid) throw forbidden("You can only edit your own comments.");

  await cRef.update({ text, updatedAt: now });
  return serializeComment(
    { id: comment.id, data: () => ({ ...comment.data(), text, updatedAt: now }) },
    { viewerUid: uid, postAuthorUid: post.data().authorUid },
  );
}

/** The comment's author or the post's author (moderating their own post) may delete. */
export async function deleteComment({ db, uid, postId, commentId }) {
  const pRef = postRef(db, postId);
  const cRef = pRef.collection("comments").doc(assertId(commentId, "Comment"));

  return db.runTransaction(async (tx) => {
    const post = await tx.get(pRef);
    const comment = await tx.get(cRef);
    if (!post.exists || !comment.exists) throw notFound("Comment");
    if (comment.data().authorUid !== uid && post.data().authorUid !== uid) {
      throw forbidden("You can't delete this comment.");
    }
    tx.delete(cRef);
    tx.update(pRef, { commentCount: Math.max((post.data().commentCount ?? 0) - 1, 0) });
    return { deleted: true };
  });
}
