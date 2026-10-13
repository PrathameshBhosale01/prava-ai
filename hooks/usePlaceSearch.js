"use client";

import { useEffect, useState } from "react";

import { MIN_QUERY_CHARS } from "@/lib/placeSearch";

const DEBOUNCE_MS = 300;

/**
 * Debounced place autocomplete.
 *   status: "idle" (nothing to search) | "loading" | "ready" | "empty" | "error"
 * Typing fast only searches the FINAL text (earlier requests are cancelled), and a result is
 * only shown if it belongs to what's currently in the box.
 */
export function usePlaceSearch(query, { enabled = true } = {}) {
  const q = String(query ?? "").replace(/\s+/g, " ").trim();
  const active = enabled && q.length >= MIN_QUERY_CHARS;
  const [result, setResult] = useState({ key: null, places: [], failed: false });

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setResult({ key: q, places: Array.isArray(data?.places) ? data.places : [], failed: false });
      } catch (e) {
        if (e?.name !== "AbortError") setResult({ key: q, places: [], failed: true });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, active]);

  if (!active) return { status: "idle", places: [] };
  if (result.key !== q) return { status: "loading", places: [] };
  if (result.failed) return { status: "error", places: [] };
  return { status: result.places.length > 0 ? "ready" : "empty", places: result.places };
}
