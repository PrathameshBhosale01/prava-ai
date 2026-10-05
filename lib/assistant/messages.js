import {
  MAX_ASSISTANT_HISTORY_CHARS,
  MAX_HISTORY_MESSAGES,
  MAX_USER_MESSAGE_CHARS,
} from "./config.js";

/**
 * Turns the untrusted `messages` array sent by the browser into Gemini
 * `contents`.
 *
 *  - only "user" / "assistant" roles with non-empty string content survive
 *  - oversized older messages are truncated, an oversized newest message is rejected
 *  - consecutive turns from the same role are merged
 *  - only the most recent MAX_HISTORY_MESSAGES turns are kept
 *  - history must start with, and end with, a user turn
 *
 * @returns {{ ok: true, contents: object[], lastUserText: string } | { ok: false, error: string }}
 */
export function sanitizeMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: "Send at least one message." };
  }

  const turns = [];
  for (const item of raw) {
    if (!item || typeof item.content !== "string") continue;
    if (item.role !== "user" && item.role !== "assistant") continue;

    const text = item.content.trim();
    if (!text) continue;

    const role = item.role === "user" ? "user" : "model";
    const limit = role === "user" ? MAX_USER_MESSAGE_CHARS : MAX_ASSISTANT_HISTORY_CHARS;
    turns.push({ role, text: text.slice(0, limit), original: text });
  }

  const last = turns[turns.length - 1];
  if (!last || last.role !== "user") {
    return { ok: false, error: "The last message must come from the user." };
  }
  if (last.original.length > MAX_USER_MESSAGE_CHARS) {
    return {
      ok: false,
      error: `Messages can be up to ${MAX_USER_MESSAGE_CHARS} characters. Please shorten yours.`,
    };
  }

  const merged = [];
  for (const turn of turns) {
    const previous = merged[merged.length - 1];
    if (previous && previous.role === turn.role) {
      previous.text += `\n\n${turn.text}`;
    } else {
      merged.push({ role: turn.role, text: turn.text });
    }
  }

  let recent = merged.slice(-MAX_HISTORY_MESSAGES);
  while (recent.length && recent[0].role !== "user") recent = recent.slice(1);

  return {
    ok: true,
    lastUserText: last.text,
    contents: recent.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
  };
}