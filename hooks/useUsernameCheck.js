"use client";

import { useEffect, useState } from "react";

import { checkUsername } from "@/lib/auth/client";
import { validateUsername } from "@/lib/auth/validation";

const DEBOUNCE_MS = 400;

/**
 * Live "is this username free?" for the sign-up form.
 *   status: "idle" (empty) | "invalid" (fails the format rules — no request is made) |
 *           "checking" | "available" | "taken" | "unknown" (couldn't check; the server still enforces)
 * Typing quickly only ever checks the FINAL value: earlier requests are cancelled, and a
 * result is only used if it belongs to what's currently in the box.
 */
export function useUsernameCheck(raw) {
  const { value, error } = validateUsername(raw);
  const [result, setResult] = useState({ key: null, status: "idle", message: "" });
  const empty = !String(raw ?? "").trim().replace(/^@+/, "");

  useEffect(() => {
    if (empty || error) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { available, reason } = await checkUsername(value, { signal: controller.signal });
        setResult({ key: value, status: available ? "available" : "taken", message: reason || "" });
      } catch (e) {
        if (e?.name !== "AbortError") setResult({ key: value, status: "unknown", message: "" });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, error, empty]);

  if (empty) return { status: "idle", value, message: "" };
  if (error) return { status: "invalid", value, message: error };
  if (result.key !== value) return { status: "checking", value, message: "" };
  return { status: result.status, value, message: result.message };
}
