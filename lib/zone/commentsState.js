// Pure state for a post's comment thread (oldest first, like the API returns them).

export const initialCommentsState = { key: null, status: "loading", items: [], error: "" };

export function commentsReducer(state, action) {
  switch (action.type) {
    case "loaded":
      return { key: action.key, status: "ready", items: action.items, error: "" };
    case "failed":
      return { ...state, key: action.key, status: "error", error: action.error };
    case "added":
      // Ignore a duplicate (double submit / retry) instead of showing it twice.
      return state.items.some((c) => c.id === action.comment.id)
        ? state
        : { ...state, items: [...state.items, action.comment] };
    case "updated":
      return { ...state, items: state.items.map((c) => (c.id === action.comment.id ? action.comment : c)) };
    case "removed":
      return { ...state, items: state.items.filter((c) => c.id !== action.id) };
    default:
      return state;
  }
}
