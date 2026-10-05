import { USAGE_TIMEZONE } from "./config.js";
import { dateKey } from "./dates.js";
import { generateItinerary, streamAssistantReply } from "./gemini.js";
import { ItineraryFormatError } from "./itinerary.js";
import { buildSystemInstruction, TRIP_TOOL_NAME } from "./prompt.js";
import { normalizeTripInput } from "./tripInput.js";
import { refundUsage, reserveUsage } from "./usage.js";

/** Maps any upstream failure to a sentence that is safe to show to the user. */
export function friendlyError(error) {
  if (error?.status === 429 || error?.status === 503) {
    return "Prava is busy right now. Please try again in a moment.";
  }
  if (error instanceof ItineraryFormatError) {
    return "I couldn't put that itinerary together. Please try again.";
  }
  return "Something went wrong while generating a reply. Please try again.";
}

function adjust(snapshot, field, delta) {
  const used = Math.max(snapshot[field].used + delta, 0);
  const { limit } = snapshot[field];
  return { ...snapshot, [field]: { used, limit, remaining: Math.max(limit - used, 0) } };
}

/**
 * Runs one assistant turn and reports progress through `emit(event)`.
 * The caller has already reserved one "message" unit and passes the resulting
 * snapshot as `usage`.
 *
 *  1. stream the model's text to the client
 *  2. if the model called create_trip_plan: validate → reserve a "plan" unit →
 *     generate the itinerary → emit the plan
 *  3. refund units when a failure meant the user got nothing for them
 */
export async function runChatPipeline({
  ai,
  db,
  models,
  uid,
  userName,
  contents,
  signal,
  emit,
  usage,
  now = new Date(),
}) {
  let snapshot = usage;
  let streamed = "";
  let toolArgs = null;
  const refund = (kind) => refundUsage({ db, uid, kind, now }).catch(() => {});

  // 1 ── conversational reply ────────────────────────────────────────────────
  try {
    const reply = streamAssistantReply({
      ai,
      models,
      contents,
      signal,
      systemInstruction: buildSystemInstruction({ today: dateKey(now, USAGE_TIMEZONE), userName }),
    });

    for await (const part of reply) {
      if (part.type === "text") {
        streamed += part.text;
        emit({ type: "text", delta: part.text });
      } else if (part.type === "tool" && part.name === TRIP_TOOL_NAME && !toolArgs) {
        toolArgs = part.args;
      }
    }
  } catch (error) {
    if (signal?.aborted) return;
    console.error("Assistant reply failed:", error);

    if (!streamed) {
      await refund("message");
      snapshot = adjust(snapshot, "messages", -1);
    }
    emit({ type: "error", message: friendlyError(error) });
    emit({ type: "done", usage: snapshot });
    return;
  }

  // 2 ── trip plan requested by the model ────────────────────────────────────
  if (toolArgs) {
    const gap = streamed ? "\n\n" : "";
    const parsed = normalizeTripInput(toolArgs, { now });

    if (!parsed.ok) {
      emit({ type: "text", delta: gap + parsed.error });
    } else {
      const reservation = await reserveUsage({ db, uid, kind: "plan", now });
      snapshot = reservation.snapshot;

      if (!reservation.allowed) {
        const limit = snapshot.plans.limit;
        emit({
          type: "text",
          delta:
            gap +
            `You've used all ${limit} trip plans for today. The limit resets tomorrow, and I'm still happy to answer travel questions in the meantime.`,
        });
      } else {
        emit({ type: "status", status: "planning" });

        try {
          const itinerary = await generateItinerary({ ai, models, trip: parsed.trip, signal });
          emit({ type: "plan", plan: { trip: parsed.trip, itinerary } });

          if (!streamed.trim()) {
            emit({
              type: "text",
              delta: `Here's your ${parsed.trip.duration}-day plan for ${parsed.trip.destination}. Save it to My Trips to keep it.`,
            });
          }
        } catch (error) {
          if (signal?.aborted) return;
          console.error("Itinerary generation failed:", error);

          await refund("plan");
          snapshot = adjust(snapshot, "plans", -1);
          emit({ type: "error", message: friendlyError(error) });
        }
      }
    }
  }

  emit({ type: "done", usage: snapshot });
}