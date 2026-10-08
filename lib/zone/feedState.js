// State machine for the feed, kept pure so it can be unit-tested without React.
//
// `key` identifies the filters (search + category + retry count) that `posts`
// were fetched for. The UI compares it with the *current* key:
//   same key      → show these posts (or the error)
//   different key → a newer request is in flight: keep showing the old posts,
//                   dimmed, instead of flashing a skeleton on every keystroke.
// Any response tagged with an old key is ignored, so a slow response for an
// outdated search can never overwrite a newer one.

export const initialFeedState = {
  posts: [],
  nextCursor: null,
  key: null,
  status: "loading", // "loading" | "ready" | "error"
  loadingMore: false,
  error: "",
};

export function feedReducer(state, action) {
  switch (action.type) {
    case "loaded":
      return { ...state, key: action.key, posts: action.posts, nextCursor: action.nextCursor, status: "ready", loadingMore: false, error: "" };

    case "failed":
      return { ...state, key: action.key, status: "error", loadingMore: false, error: action.error };

    case "more-start":
      return { ...state, loadingMore: true };

    case "more-loaded": {
      if (action.key !== state.key) return { ...state, loadingMore: false }; // filters changed meanwhile
      // Guard against duplicates (e.g. a post was created between pages).
      const seen = new Set(state.posts.map((p) => p.id));
      const fresh = action.posts.filter((p) => !seen.has(p.id));
      return { ...state, posts: [...state.posts, ...fresh], nextCursor: action.nextCursor, loadingMore: false };
    }

    case "more-failed":
      return { ...state, loadingMore: false };

    // Optimistic like: flip immediately and adjust the count…
    case "like-optimistic":
      return mapPost(state, action.id, (p) =>
        p.likedByMe === action.liked
          ? p
          : { ...p, likedByMe: action.liked, likeCount: Math.max(p.likeCount + (action.liked ? 1 : -1), 0) },
      );

    // …then trust the server's numbers once it answers…
    case "like-settled":
      return mapPost(state, action.id, (p) => ({ ...p, likedByMe: action.liked, likeCount: action.likeCount }));

    // …or put things back if the request failed.
    case "like-revert":
      return mapPost(state, action.id, (p) => ({ ...p, likedByMe: action.previous.likedByMe, likeCount: action.previous.likeCount }));

    default:
      return state;
  }
}

function mapPost(state, id, fn) {
  return { ...state, posts: state.posts.map((p) => (p.id === id ? fn(p) : p)) };
}
