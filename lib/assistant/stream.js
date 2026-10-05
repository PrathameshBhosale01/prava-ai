// Wire format between /api/assistant/chat and the browser: newline-delimited JSON.
//
//   { type: "text",   delta }      – a piece of the assistant's answer
//   { type: "status", status }     – progress marker, e.g. "planning"
//   { type: "plan",   plan }       – { trip, itinerary } ready to preview / save
//   { type: "error",  message }    – something failed; message is user-safe
//   { type: "done",   usage }      – always the last event on success

export function encodeEvent(event) {
  return `${JSON.stringify(event)}\n`;
}

function safeParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/** Async-iterates the events in a fetch() response body (a ReadableStream of bytes). */
export async function* parseNdjsonStream(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        const event = line ? safeParse(line) : null;
        if (event) yield event;
        newline = buffer.indexOf("\n");
      }
    }

    const rest = (buffer + decoder.decode()).trim();
    const event = rest ? safeParse(rest) : null;
    if (event) yield event;
  } finally {
    reader.releaseLock();
  }
}