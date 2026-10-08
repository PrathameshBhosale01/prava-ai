import { badRequest, ZoneError } from "../zone/errors.js";
import { validateSignup, validateUsername } from "./validation.js";

// Account creation. Done on the server (Admin SDK) because:
//  - usernames must be unique, which needs a transaction on a `usernames/{name}` doc;
//  - the Firestore rules only let a user *update* name/preferences, so `username` can't
//    be added from the browser after the profile exists;
//  - it lets us roll back cleanly instead of leaving half-created accounts.
//
// `db` and `adminAuth` are the Admin SDK instances, injected so tests can pass fakes.

const usernameTaken = () =>
  new ZoneError(409, "That username is already taken.", { code: "conflict", fields: { username: "That username is already taken." } });

function mapCreateUserError(error) {
  switch (error?.code) {
    case "auth/email-already-exists":
      return new ZoneError(409, "An account with this email already exists.", {
        code: "conflict",
        fields: { email: "An account with this email already exists. Try signing in instead." },
      });
    case "auth/invalid-password":
      return badRequest("Please choose a stronger password.", { password: "Please choose a stronger password." });
    case "auth/invalid-email":
      return badRequest("Please fix the highlighted fields.", { email: "That doesn't look like a valid email." });
    default:
      return error;
  }
}

/** Validates the sign-up body. Pure & I/O-free, so the route can run it before rate limiting. */
export function prepareSignup(input) {
  const { values, fields } = validateSignup(input);
  if (Object.keys(fields).length > 0) throw badRequest("Please fix the highlighted fields.", fields);
  return values;
}

/** → { available: true } | { available: false, reason } */
export async function isUsernameAvailable({ db, username }) {
  const { value, error } = validateUsername(username);
  if (error) return { available: false, reason: error };
  const snap = await db.collection("usernames").doc(value).get();
  return snap.exists ? { available: false, reason: "That username is already taken." } : { available: true };
}

export async function createAccount({ db, adminAuth, values, now = new Date() }) {
  const usernameRef = db.collection("usernames").doc(values.username);

  // Cheap early exit so an obviously-taken username doesn't create (then delete) an auth user.
  if ((await usernameRef.get()).exists) throw usernameTaken();

  let record;
  try {
    record = await adminAuth.createUser({ email: values.email, password: values.password, displayName: values.name });
  } catch (error) {
    throw mapCreateUserError(error);
  }

  try {
    await db.runTransaction(async (tx) => {
      // Re-check inside the transaction: two people can pass the early check at once.
      if ((await tx.get(usernameRef)).exists) throw usernameTaken();
      tx.set(usernameRef, { uid: record.uid, createdAt: now });
      tx.set(db.collection("users").doc(record.uid), {
        uid: record.uid,
        name: values.name,
        username: values.username,
        email: values.email,
        photoURL: "",
        preferences: values.interests,
        createdAt: now,
        updatedAt: now,
      });
    });
  } catch (error) {
    // Roll back so the person can fix the problem and retry with the same email.
    await adminAuth.deleteUser(record.uid).catch((e) => console.error("Signup rollback failed:", e));
    throw error;
  }

  return { uid: record.uid };
}

/** validate + create in one call (the route splits these so it can rate-limit in between). */
export async function signUp({ db, adminAuth, input, now }) {
  return createAccount({ db, adminAuth, values: prepareSignup(input), now });
}
