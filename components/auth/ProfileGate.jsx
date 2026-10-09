"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { gateState, SKIP_KEY } from "@/lib/auth/profileState";

const noSubscribe = () => () => {};
const readSkipped = () => {
  try {
    return sessionStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Wraps the dashboard pages. Accounts without a username (Google sign-ups, older accounts)
 * are sent to /onboarding once; everyone else sees the page. See lib/auth/profileState.js
 * for the rules: it fails OPEN, so a problem reading the profile never locks anyone out.
 */
export default function ProfileGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { status, profile } = useProfile(user?.uid);

  // sessionStorage can't be read during server rendering; the server snapshot says "not skipped".
  const skipped = useSyncExternalStore(noSubscribe, readSkipped, () => false);

  const decision = gateState({ authLoading: loading, hasUser: Boolean(user), profileStatus: status, profile, skipped });

  useEffect(() => {
    if (decision === "onboard") router.replace(`/onboarding?next=${encodeURIComponent(pathname)}`);
  }, [decision, pathname, router]);

  if (decision === "pass") return children;

  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading your profile">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>
  );
}
