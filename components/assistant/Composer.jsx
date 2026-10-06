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
         <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-card transition focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/15">
          {speech.supported && (
            <button
              type="button"
              onClick={toggleDictation}
              aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
              aria-pressed={speech.listening}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                speech.listening
                 ? "animate-pulse bg-danger-soft text-danger"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
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
             className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-5 text-foreground outline-none! placeholder:text-muted-foreground"
          />

          {busy ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop generating"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary-hover"

            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground"
            >
              <ArrowUp size={20} />
            </button>
          )}
        </div>

         <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
          <p className={speech.error ? "text-danger" : undefined}>
          </p>
          {nearLimit && (
            <span className={value.length >= MAX_USER_MESSAGE_CHARS ? "text-danger" : undefined}>
              {value.length}/{MAX_USER_MESSAGE_CHARS}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}