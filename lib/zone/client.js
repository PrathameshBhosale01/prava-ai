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

  getPost(postId, { signal } = {}) {
    return request(`/posts/${encodeURIComponent(postId)}`, { signal });
  },

  deletePost(postId) {
    return request(`/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
  },

  listComments(postId, { signal } = {}) {
    return request(`/posts/${encodeURIComponent(postId)}/comments`, { signal });
  },

  addComment(postId, text) {
    return request(`/posts/${encodeURIComponent(postId)}/comments`, { method: "POST", body: { text } });
  },

  updateComment(postId, commentId, text) {
    return request(`/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, { method: "PATCH", body: { text } });
  },

  deleteComment(postId, commentId) {
    return request(`/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" });
  },

  createPost(input) {
    return request("/posts", { method: "POST", body: input });
  },

  updatePost(postId, input) {
    return request(`/posts/${encodeURIComponent(postId)}`, { method: "PATCH", body: input });
  },

  /** Uploads one photo with progress (fetch can't report upload progress, XHR can). → { url, width, height } */
  async uploadImage(file, { onProgress, signal } = {}) {
    const user = auth.currentUser;
    if (!user) throw new ApiError("Please sign in again.", 401);
    const token = await user.getIdToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/zone/upload");
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        let data = null;
        try {
          data = JSON.parse(xhr.responseText);
        } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new ApiError(data?.error || "Upload failed. Please try again.", xhr.status));
      };
      xhr.onerror = () => reject(new ApiError("Upload failed. Check your connection."));
      xhr.onabort = () => reject(Object.assign(new Error("Upload cancelled"), { name: "AbortError" }));
      signal?.addEventListener("abort", () => xhr.abort(), { once: true });

      const form = new FormData();
      form.append("file", file);
      xhr.send(form);
    });
  },

  setLike(postId, liked) {
    return request(`/posts/${encodeURIComponent(postId)}/like`, { method: "PUT", body: { liked } });
  },
};
