"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

// Persisted state that is safe for server rendering: the server and the first
// client render both see `fallback`, then the stored value takes over.
// Falls back to memory when localStorage is blocked (private mode, quota).

const listeners = new Map(); // key -> Set<callback>
const memory = new Map(); // key -> raw string

function readRaw(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) return raw;
  } catch {
    // blocked: use memory below
  }
  return memory.get(key) ?? null;
}

function subscribe(key, callback) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(callback);

  const onStorage = (event) => {
    if (event.key === key) callback();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    set.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStoredState(key, fallback) {
  // `fallback` must be a stable value (define it outside the component).
  const raw = useSyncExternalStore(
    (callback) => subscribe(key, callback),
    () => readRaw(key),
    () => null
  );

  const value = useMemo(() => {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }, [raw, fallback]);

  const setValue = useCallback(
    (next) => {
      const resolved = typeof next === "function" ? next(value) : next;
      const serialized = JSON.stringify(resolved);

      memory.set(key, serialized);
      try {
        window.localStorage.setItem(key, serialized);
      } catch {
        // memory copy keeps the UI working for this session
      }
      listeners.get(key)?.forEach((callback) => callback());
    },
    [key, value]
  );

  return [value, setValue];
}
