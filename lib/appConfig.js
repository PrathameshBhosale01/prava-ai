// App-wide settings that more than one screen needs.

// Where "Share feedback" in the profile sends email. Set
// NEXT_PUBLIC_FEEDBACK_EMAIL to override without touching code.
export const FEEDBACK_EMAIL =
  process.env.NEXT_PUBLIC_FEEDBACK_EMAIL || "bhosaleprathamesh202@gmail.com";

export function getFeedbackHref(email = FEEDBACK_EMAIL) {
  return `mailto:${email}?subject=${encodeURIComponent("Prava AI feedback")}`;
}