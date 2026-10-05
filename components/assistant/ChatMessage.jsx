"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Copy, RotateCcw } from "lucide-react";

import AssistantMark from "./AssistantMark";
import Markdown from "./Markdown";
import TypingIndicator from "./TypingIndicator";

function formatTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context / denied permission).
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-gray-400"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ErrorNote({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <CircleAlert size={18} className="mt-0.5 shrink-0 text-red-500" />
      <p className="flex-1 leading-6">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
        >
          <RotateCcw size={13} />
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * One chat turn. `extras` is rendered under the text (the trip plan card or its
 * loading state), keeping this component free of trip-specific code.
 */
export default function ChatMessage({ message, extras, canRetry, onRetry }) {
  if (message.role === "user") {
    return (
      <div className="group flex justify-end">
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-md bg-gray-900 px-4 py-2.5 text-[15px] leading-6 text-white">
            {message.content}
          </div>
          <time className="mt-1 block text-right text-[11px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
            {formatTime(message.createdAt)}
          </time>
        </div>
      </div>
    );
  }

  const thinking = message.pending && !message.content && message.phase === "thinking";
  const done = !message.pending;

  return (
    <div className="group flex gap-3">
      <AssistantMark size="sm" />

      <div className="min-w-0 flex-1 pt-0.5">
        {message.content && (
          <div className="text-[15px] leading-7 text-gray-800 wrap-break-word">
            <Markdown>{message.content}</Markdown>
          </div>
        )}

        {thinking && <TypingIndicator />}

        {message.stopped && !message.content && !message.plan && (
          <p className="text-sm italic text-gray-400">Response stopped.</p>
        )}

        {extras}

        {message.error && <ErrorNote message={message.error} onRetry={canRetry ? onRetry : undefined} />}

        {done && message.content && !message.error && (
          <div className="mt-1.5 flex items-center gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <CopyButton text={message.content} />
            <time className="text-[11px] text-gray-400">{formatTime(message.createdAt)}</time>
            {message.stopped && <span className="text-[11px] text-gray-400">· Stopped</span>}
          </div>
        )}
      </div>
    </div>
  );
}