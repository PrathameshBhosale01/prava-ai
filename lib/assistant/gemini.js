import { buildItineraryPrompt } from "../itineraryPrompt.js";
import { ItineraryFormatError, normalizeItinerary, parseJsonLoose } from "./itinerary.js";
import { buildTripTool } from "./prompt.js";

// These helpers receive the `ai` client (GoogleGenAI) as an argument so they can
// be unit-tested with a fake. The route passes the real one from lib/gemini.js.

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const isRetryable = (error) => RETRYABLE_STATUS.has(error?.status);
// An unknown / retired model name: skip straight to the fallback model.
const isModelMissing = (error) => error?.status === 404;
const isAbort = (error, signal) => Boolean(signal?.aborted) || error?.name === "AbortError";

function sleep(ms, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * Streams the assistant's reply. Yields:
 *   { type: "text", text }            – a piece of the answer
 *   { type: "tool", name, args }      – the model wants to call a tool
 *
 * Transient errors (429/5xx) are retried and then fall back to the next model,
 * but only while nothing has been yielded yet, so the user never sees a
 * half-written answer silently restart.
 */
export async function* streamAssistantReply({
  ai,
  models,
  contents,
  systemInstruction,
  signal,
  retryDelayMs = 800,
}) {
  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let yielded = false;
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction,
            tools: [buildTripTool()],
            temperature: 0.7,
            abortSignal: signal,
          },
        });

        for await (const chunk of stream) {
          const parts = chunk?.candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (part.thought) continue;

            if (part.functionCall) {
              yielded = true;
              yield { type: "tool", name: part.functionCall.name, args: part.functionCall.args ?? {} };
            } else if (typeof part.text === "string" && part.text) {
              yielded = true;
              yield { type: "text", text: part.text };
            }
          }
        }
        return;
      } catch (error) {
        if (isAbort(error, signal)) throw error;
        lastError = error;
        if (yielded) throw error;
        if (isModelMissing(error)) break;
        if (!isRetryable(error)) throw error;
        await sleep(retryDelayMs * 2 ** attempt, signal);
      }
    }
  }

  throw lastError ?? new Error("No Gemini model available");
}

/**
 * Generates a validated itinerary for a normalized trip (see tripInput.js).
 * Retries transient API errors and malformed JSON, then falls back to the next model.
 */
export async function generateItinerary({ ai, models, trip, signal, retryDelayMs = 1000 }) {
  const prompt = buildItineraryPrompt(trip);
  let lastError;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: "application/json", temperature: 0.6, abortSignal: signal },
        });
        return normalizeItinerary(parseJsonLoose(response.text));
      } catch (error) {
        if (isAbort(error, signal)) throw error;
        lastError = error;
        if (isModelMissing(error)) break;
        if (!isRetryable(error) && !(error instanceof ItineraryFormatError)) throw error;
        await sleep(retryDelayMs * 2 ** attempt, signal);
      }
    }
  }

  throw lastError ?? new Error("Itinerary generation failed");
}