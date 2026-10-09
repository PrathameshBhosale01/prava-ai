import { auth } from "@/lib/firebase";

// Thin browser client for the expense API. It attaches the signed-in user's ID
// token; the server decides who the caller is from that token alone.

export class ApiError extends Error {
  constructor(message, { status = 0, fields } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

const NETWORK = "Couldn't reach the server. Check your connection and try again.";

async function request(path, { method = "GET", body } = {}) {
  const user = auth.currentUser;
  if (!user) throw new ApiError("Please sign in again.", { status: 401 });

  let response;
  try {
    response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${await user.getIdToken()}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(NETWORK);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || "Something went wrong. Please try again.", {
      status: response.status,
      fields: data.fields,
    });
  }
  return data;
}

export const loadExpenseData = () => request("/api/tools/expenses");
export const createExpenseRequest = (input) =>
  request("/api/tools/expenses", { method: "POST", body: input }).then((r) => r.expense);
export const updateExpenseRequest = (id, changes) =>
  request(`/api/tools/expenses/${id}`, { method: "PATCH", body: changes }).then((r) => r.expense);
export const deleteExpenseRequest = (id) => request(`/api/tools/expenses/${id}`, { method: "DELETE" });
export const createBucketRequest = (title) =>
  request("/api/tools/expense-buckets", { method: "POST", body: { title } }).then((r) => r.bucket);
export const deleteBucketRequest = (id) => request(`/api/tools/expense-buckets/${id}`, { method: "DELETE" });
