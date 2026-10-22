import { USAGE_TIMEZONE } from "./config.js";
import { dateKey } from "./dates.js";
import { generateItinerary, streamAssistantReply } from "./gemini.js";
import { ItineraryFormatError } from "./itinerary.js";
import { buildSystemInstruction, TRIP_TOOL_NAME } from "./prompt.js";
import { normalizeTripInput } from "./tripInput.js";
import { isMultiStop, routeLabel } from "../trips/stops.js";
import { checkTripLimits, creditCost } from "../plans.js";
import { chatPlanLimitMessage, creditLimitMessage, refundUsage, reserveUsage } from "./usage.js";

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

/** Local copy of the credit meter after giving credits back, so the UI updates without another read. */
function giveBack(snapshot, kind) {
  const { used, limit } = snapshot.credits;
  const next = Math.max(used - creditCost(kind), 0);
  const chat = snapshot.chatPlans;
  const chatPlans =
    kind === "chatPlan" && chat?.limit !== null && chat
      ? { used: Math.max(chat.used - 1, 0), limit: chat.limit, remaining: Math.min(chat.remaining + 1, chat.limit) }
      : chat;
  return { ...snapshot, credits: { used: next, limit, remaining: Math.max(limit - next, 0) }, chatPlans };
}

/**
 * Runs one assistant turn and reports progress through `emit(event)`.
 * The caller has already reserved the "message" credits and passes the resulting
 * snapshot as `usage`.
 *
 *  1. stream the model's text to the client
 *  2. if the model called create_trip_plan: validate → reserve the "plan" credits →
 *     generate the itinerary → emit the plan
 *  3. refund credits when a failure meant the user got nothing for them
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
      snapshot = giveBack(snapshot, "message");
    }
    emit({ type: "error", message: friendlyError(error) });
    emit({ type: "done", usage: snapshot });
    return;
  }

  // 2 ── trip plan requested by the model ────────────────────────────────────
  if (toolArgs) {
    const gap = streamed ? "\n\n" : "";
    const parsed = normalizeTripInput(toolArgs, { now });

    // The plan decides how long and how many cities a trip may be (checked before spending credits).
    const fits = parsed.ok
      ? checkTripLimits(snapshot.plan, { stops: parsed.trip.stops?.length ?? 1, days: parsed.trip.duration })
      : { ok: true };

    if (!parsed.ok) {
      emit({ type: "text", delta: gap + parsed.error });
    } else if (!fits.ok) {
      emit({ type: "text", delta: `${gap}${fits.message} Want me to plan a shorter version?` });
      emit({ type: "upgrade", code: fits.code, message: fits.message });
    } else {
      const reservation = await reserveUsage({ db, uid, kind: "chatPlan", now });
      snapshot = reservation.snapshot;

      if (!reservation.allowed) {
        const chatCapped = reservation.reason === "chatPlans";
        const message = chatCapped ? chatPlanLimitMessage(snapshot) : creditLimitMessage(snapshot, reservation.cost);
        emit({ type: "text", delta: gap + message });
        if (snapshot.plan === "free") emit({ type: "upgrade", code: chatCapped ? "CHAT_PLAN_LIMIT" : "LIMIT_REACHED", message });
      } else {
        emit({ type: "status", status: "planning" });

        try {
          const itinerary = await generateItinerary({ ai, models, trip: parsed.trip, signal });
          emit({ type: "plan", plan: { trip: parsed.trip, itinerary } });

          if (!streamed.trim()) {
            emit({
              type: "text",
              delta: `Here's your ${parsed.trip.duration}-day plan for ${(isMultiStop(parsed.trip) ? routeLabel(parsed.trip) : parsed.trip.destination)}. Save it to My Trips to keep it.`,
            });
          }
        } catch (error) {
          if (signal?.aborted) return;
          console.error("Itinerary generation failed:", error);

          await refund("chatPlan");
          snapshot = giveBack(snapshot, "chatPlan");
          emit({ type: "error", message: friendlyError(error) });
        }
      }
    }
  }

  emit({ type: "done", usage: snapshot });
}