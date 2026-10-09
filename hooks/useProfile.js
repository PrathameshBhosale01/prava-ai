"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/lib/firebase";

// A brand-new Google user's profile doc is created by AuthContext a moment AFTER sign-in.
// "missing" covers that gap; if it never appears we stop waiting and report "error" so the
// app fails open instead of spinning forever.
const MISSING_GRACE_MS = 6000;

/**
 * Live view of users/{uid}.
 *   status: "loading" | "ready" | "missing" | "error"
 * Uses a snapshot listener, so when the profile is saved elsewhere (the onboarding form)
 * every consumer updates on its own.
 */
export function useProfile(uid) {
  const [state, setState] = useState({ uid: null, status: "loading", profile: null });

  useEffect(() => {
    if (!uid) return;
    let timer;
    const unsubscribe = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        clearTimeout(timer);
        if (snap.exists()) {
          setState({ uid, status: "ready", profile: snap.data() });
          return;
        }
        setState({ uid, status: "missing", profile: null });
        timer = setTimeout(() => setState((s) => (s.uid === uid && s.status === "missing" ? { ...s, status: "error" } : s)), MISSING_GRACE_MS);
      },
      (error) => {
        console.error("Couldn't read profile:", error);
        setState({ uid, status: "error", profile: null });
      },
    );
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [uid]);

  // State left over from a previous user is never shown to the current one.
  if (!uid || state.uid !== uid) return { status: "loading", profile: null };
  return { status: state.status, profile: state.profile };
}
