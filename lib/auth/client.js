import { auth } from "@/lib/firebase";

// Browser-side calls to /api/auth/*. Failures become AuthApiError with a message that is
// safe to show and (for 400/409) the per-field messages the form can display inline.

export class AuthApiError extends Error {
  constructor(message, { status = 0, fields } = {}) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.fields = fields;
  }
}

async function call(path, { method = "GET", body, signal, authenticated = false } = {}) {
  const headers = body ? { "Content-Type": "application/json" } : {};
  if (authenticated) {
    const user = auth.currentUser;
    if (!user) throw new AuthApiError("Please sign in again.", { status: 401 });
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  let response;
  try {
    response = await fetch(path, { method, signal, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (error) {
    if (error?.name === "AbortError") throw error; // we cancelled it on purpose; not a failure
    throw new AuthApiError("Can't reach the server. Check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new AuthApiError(data?.error || "Something went wrong. Please try again.", { status: response.status, fields: data?.fields });
  return data;
}

/** → { available: boolean, reason?: string } */
export const checkUsername = (username, { signal } = {}) => call(`/api/auth/username?u=${encodeURIComponent(username)}`, { signal });

/** Creates the account on the server. The caller then signs in with the same email + password. */
export const registerAccount = (payload) => call("/api/auth/signup", { method: "POST", body: payload });

/** Finishes the profile of a signed-in user (username + interests + name). */
export const saveProfile = (payload) => call("/api/auth/profile", { method: "POST", body: payload, authenticated: true });
