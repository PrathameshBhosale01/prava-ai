"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getSupported = () =>
  typeof window !== "undefined" &&
  Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
const getServerSupported = () => false;

/**
 * Voice dictation through the browser's Web Speech API (Chrome, Edge, Safari).
 * `onTranscript` receives the full transcript of the current dictation session
 * (interim results included) every time it changes.
 */
export function useSpeechInput({ onTranscript, lang } = {}) {
  const supported = useSyncExternalStore(subscribe, getSupported, getServerSupported);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = lang || navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index++) {
        transcript += event.results[index][0].transcript;
      }
      onTranscriptRef.current?.(transcript.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access is blocked. Allow it in your browser settings to dictate.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError("Voice input isn't available right now.");
      }
      setListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    recognitionRef.current = recognition;
    setError(null);

    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => recognitionRef.current?.stop(), []);

  return { supported, listening, error, start, stop };
}