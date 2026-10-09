import { badRequest, ZoneError } from "../zone/errors.js";
import { validateProfile } from "./profileValidation.js";

// Finishing a profile for someone who already has an account (e.g. signed up with Google).
// Same guarantees as sign-up: the username claim and the profile write happen in ONE
// transaction, so usernames stay unique even when two people submit at the same moment.

const taken = () =>
  new ZoneError(409, "That username is already taken.", { code: "conflict", fields: { username: "That username is already taken." } });

const alreadySet = () =>
  new ZoneError(409, "Your username is already set and can't be changed here.", {
    code: "conflict",
    fields: { username: "Your username is already set and can't be changed here." },
  });

/**
 * `uid` comes from the VERIFIED token, never from the request body.
 * → { username }
 */
export async function completeProfile({ db, adminAuth, uid, input, now = new Date() }) {
  const { values, fields } = validateProfile(input);
  if (Object.keys(fields).length > 0) throw badRequest("Please fix the highlighted fields.", fields);

  const userRef = db.collection("users").doc(uid);
  const usernameRef = db.collection("usernames").doc(values.username);

  // If the profile doc doesn't exist yet (the client creates it a moment after sign-in),
  // build it from the account record instead of failing.
  const before = await userRef.get();
  const authRecord = before.exists ? null : await adminAuth.getUser(uid);

  const nameChanged = await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const claim = await tx.get(usernameRef);
    const current = userSnap.exists ? userSnap.data() : null;

    if (current?.username && current.username !== values.username) throw alreadySet();
    if (claim.exists && claim.data().uid !== uid) throw taken();
    if (!claim.exists) tx.set(usernameRef, { uid, createdAt: now });

    const bootstrap = current ? {} : { uid, email: authRecord?.email || "", photoURL: authRecord?.photoURL || "", createdAt: now };
    tx.set(userRef, { ...bootstrap, name: values.name, username: values.username, preferences: values.interests, updatedAt: now }, { merge: true });
    return current?.name !== values.name;
  });

  // Keep the sign-in account's display name in step (the blog shows it as the author name).
  // Best effort: the profile is already saved, so a failure here must not fail the request.
  if (nameChanged) {
    await adminAuth.updateUser(uid, { displayName: values.name }).catch((e) => console.error("displayName sync failed:", e));
  }

  return { username: values.username };
}
