import { ai } from "@/lib/gemini";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyIdToken } from "@/lib/serverAuth";
import { sanitizeMessages } from "@/lib/assistant/messages";
import { runChatPipeline } from "@/lib/assistant/pipeline";
import { encodeEvent } from "@/lib/assistant/stream";
import { reserveUsage } from "@/lib/assistant/usage";

// Itinerary generation can take a while; give the function room to finish.
export const maxDuration = 60;

// Same model list as app/api/trips/[id]/itinerary: override with GEMINI_MODEL.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.8-flash", "gemini-3.5-flash-lite"];

const json = (body, status) => Response.json(body, { status });

/**
 * POST /api/assistant/chat
 * Body: { messages: [{ role: "user" | "assistant", content: string }] }
 * Auth: Authorization: Bearer <Firebase ID token>
 * Response: application/x-ndjson stream, see lib/assistant/stream.js
 */
export async function POST(request) {
  // 1. Authenticate
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Please sign in to use the assistant." }, 401);
  }

  let decoded;
  try {
    decoded = await verifyIdToken(authorization.substring(7));
  } catch {
    return json({ error: "Your session has expired. Please sign in again." }, 401);
  }

  // 2. Validate input
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  const parsed = sanitizeMessages(body?.messages);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  // 3. Enforce the daily message limit
  const uid = decoded.uid;
  let reservation;
  try {
    reservation = await reserveUsage({ db: adminDb, uid, kind: "message" });
  } catch (error) {
    console.error("Usage reservation failed:", error);
    return json({ error: "Couldn't start the assistant. Please try again." }, 500);
  }

  if (!reservation.allowed) {
    return json(
      {
        error: `You've reached today's limit of ${reservation.snapshot.messages.limit} assistant messages. It resets tomorrow.`,
        code: "LIMIT_REACHED",
        usage: reservation.snapshot,
      },
      429,
    );
  }

  // 4. Stream the turn
  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort(), { once: true });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(streamController) {
      const emit = (event) => {
        try {
          streamController.enqueue(encoder.encode(encodeEvent(event)));
        } catch {
          // The client went away; nothing left to deliver.
        }
      };

      try {
        await runChatPipeline({
          ai,
          db: adminDb,
          models: MODELS,
          uid,
          userName: decoded.name?.split(" ")[0],
          contents: parsed.contents,
          signal: controller.signal,
          emit,
          usage: reservation.snapshot,
        });
      } catch (error) {
        console.error("Assistant pipeline crashed:", error);
        emit({ type: "error", message: "Something went wrong. Please try again." });
        emit({ type: "done", usage: reservation.snapshot });
      } finally {
        try {
          streamController.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}