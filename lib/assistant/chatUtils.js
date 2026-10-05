// Pure helpers for chat history (no Firebase imports, so they are unit-testable).

export const NEW_CHAT_TITLE = "New chat";

/** Unique id for chats and messages. */
export function newId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Sidebar title derived from the first user message. */
export function deriveTitle(text, max = 48) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return NEW_CHAT_TITLE;
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** One-line preview stored on the chat for list rows. */
export function previewOf(text, max = 90) {
  const clean = String(text ?? "").replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/**
 * Converts in-memory messages to what the API accepts. Failed or empty
 * messages are skipped, and a generated plan is mentioned in text so the model
 * remembers it exists (the plan JSON itself is never sent back).
 */
export function toApiMessages(messages) {
  return messages
    .filter((message) => !message.pending && !message.error)
    .map((message) => {
      let content = (message.content ?? "").trim();
      if (message.role === "assistant" && message.plan) {
        const { trip } = message.plan;
        content += `\n\n(A ${trip.duration}-day plan for ${trip.destination} was generated and shown to the user.)`;
      }
      return { role: message.role, content: content.trim() };
    })
    .filter((message) => message.content);
}

/** Strips transient UI flags and `undefined`s so the message can be stored in Firestore. */
export function toStoredMessage(message) {
  const stored = {
    id: message.id,
    role: message.role,
    content: message.content ?? "",
    createdAt: message.createdAt,
  };
  if (message.plan) stored.plan = message.plan;
  if (message.error) stored.error = message.error;
  if (message.stopped) stored.stopped = true;
  return stored;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Groups chats (newest first) into Today / Yesterday / Previous 7 days / Older. */
export function groupChatsByDate(chats, now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const buckets = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const chat of chats) {
    const time = chat.updatedAt ?? 0;
    if (time >= startOfToday) buckets[0].items.push(chat);
    else if (time >= startOfToday - DAY_MS) buckets[1].items.push(chat);
    else if (time >= startOfToday - 7 * DAY_MS) buckets[2].items.push(chat);
    else buckets[3].items.push(chat);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}