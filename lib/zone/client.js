import { auth } from "@/lib/firebase";

// Browser-side wrapper for /api/zone/*. Attaches the Firebase ID token and turns
// every failure into an ApiError with a message that is safe to show to users.

export class ApiError extends Error {
  constructor(message, status = 0, fields) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function request(path, { method = "GET", body, signal } = {}) {
  const user = auth.currentUser;
  if (!user) throw new ApiError("Please sign in again.", 401);
  const token = await user.getIdToken();

  let response;
  try {
    response = await fetch(`/api/zone${path}`, {
      method,
      signal,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error; // callers cancel on purpose; not a failure
    throw new ApiError("Can't reach the server. Check your connection and try again.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error || "Something went wrong. Please try again.", response.status, data?.fields);
  return data;
}

export const zoneApi = {
  listPosts({ q = "", category = "", cursor = "", limit, signal } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));
    const query = params.toString();
    return request(`/posts${query ? `?${query}` : ""}`, { signal });
  },

  setLike(postId, liked) {
    return request(`/posts/${encodeURIComponent(postId)}/like`, { method: "PUT", body: { liked } });
  },
};
