"use client";

import { useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { getPlan, resolvePlan } from "@/lib/plans";

/**
 * The signed-in user's plan, read from their live profile.
 * `ready` is false until the profile has loaded: until then don't block anything on "free" limits,
 * or a Pro user would be refused for a moment. The server is what really enforces credits.
 */
export function usePlan() {
  const { profile } = useAuth();
  const [now] = useState(() => new Date()); // fixed per mount: keeps render pure
  const plan = resolvePlan(profile, now);
  return { plan, isPro: plan === "pro", limits: getPlan(plan), ready: profile !== null };
}
