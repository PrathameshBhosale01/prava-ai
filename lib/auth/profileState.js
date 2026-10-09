// Pure rules for "does this account still need the complete-your-profile step?".
// Kept free of React/Firebase so they can be unit-tested.

/** Skipping lasts for the browser session only: the prompt returns on the next sign-in. */
export const SKIP_KEY = "prava:profile-prompt-skipped";

/** A profile is incomplete until it has a username (sign-up and the onboarding form both set one). */
export const needsProfile = (profile) => !profile || typeof profile.username !== "string" || profile.username.trim() === "";

/**
 * What the dashboard should do right now:
 *   "pass"    – render the page (also the safe default whenever we can't tell)
 *   "wait"    – still finding out; show a spinner
 *   "onboard" – send them to /onboarding
 *
 * It fails OPEN: if the profile can't be read, people are never locked out of the app.
 */
export function gateState({ authLoading, hasUser, profileStatus, profile, skipped }) {
  if (authLoading || !hasUser) return "pass"; // the dashboard shell has its own sign-in handling
  if (profileStatus === "loading" || profileStatus === "missing") return "wait"; // "missing" = profile doc is about to be created
  if (profileStatus === "error") return "pass";
  return needsProfile(profile) && !skipped ? "onboard" : "pass";
}
