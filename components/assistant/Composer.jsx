"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";

import { MAX_USER_MESSAGE_CHARS } from "@/lib/assistant/config";
import { useSpeechInput } from "@/hooks/useSpeechInput";

const MAX_HEIGHT_PX = 200;

const joinText = (base, addition) => [base.trim(), addition].filter(Boolean).join(" ");

/**
 * Message box: auto-growing textarea, voice dictation, and a send button that
 * turns into a stop button while the assistant is answering.
 * `onSend(text)` must return false when the message was not accepted.
 */
export default function Composer({ onSend, onStop, busy }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);
  const dictationBaseRef = useRef("");

  const speech = useSpeechInput({
    onTranscript: (transcript) => setValue(joinText(dictationBaseRef.current, transcript)),
  });

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || busy) return;
    speech.stop();
    if (onSend(text) !== false) setValue("");
  };

  const toggleDictation = () => {
    if (speech.listening) {
      speech.stop();
    } else {
      dictationBaseRef.current = value;
      speech.start();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const canSend = value.trim().length > 0 && !busy;
  const nearLimit = value.length > MAX_USER_MESSAGE_CHARS * 0.85;

  return (
    <div className="px-4 pb-4 pt-2 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white p-2 shadow-sm transition focus-within:border-gray-400 focus-within:ring-4 focus-within:ring-gray-100">
          {speech.supported && (
            <button
              type="button"
              onClick={toggleDictation}
              aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
              aria-pressed={speech.listening}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                speech.listening
                  ? "animate-pulse bg-red-50 text-red-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              }`}
            >
              <Mic size={20} />
            </button>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={MAX_USER_MESSAGE_CHARS}
            autoFocus
            aria-label="Message Prava"
            placeholder={speech.listening ? "Listening…" : "Ask about destinations, budgets, or plan a trip…"}
            className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-5 text-gray-900 outline-none placeholder:text-gray-400"
          />

          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white transition hover:bg-gray-700"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              <ArrowUp size={20} />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-gray-400">
          <p className={speech.error ? "text-red-600" : undefined}>
            {speech.error ?? "Prava can make mistakes. Check prices and availability before booking."}
          </p>
          {nearLimit && (
            <span className={value.length >= MAX_USER_MESSAGE_CHARS ? "text-red-600" : undefined}>
              {value.length}/{MAX_USER_MESSAGE_CHARS}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}