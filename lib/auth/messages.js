// Firebase client-SDK error codes → copy a person can act on.
// Returns null when nothing should be shown (e.g. they closed the Google popup).
//
// Wrong password and unknown email deliberately share one message: telling them apart
// would let anyone probe which emails have accounts.

const MESSAGES = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-login-credentials": "Incorrect email or password.",
  "auth/invalid-email": "That doesn't look like a valid email.",
  "auth/user-disabled": "This account has been disabled. Please contact support.",
  "auth/too-many-requests": "Too many attempts. Wait a few minutes, or reset your password.",
  "auth/network-request-failed": "Can't reach the server. Check your connection and try again.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/account-exists-with-different-credential": "An account with this email already exists using a different sign-in method.",
  "auth/operation-not-allowed": "This sign-in method isn't enabled yet.",
};

const SILENT = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export function friendlyAuthError(code) {
  if (SILENT.has(code)) return null;
  return MESSAGES[code] || "Something went wrong. Please try again.";
}
